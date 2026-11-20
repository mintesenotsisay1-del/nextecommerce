"use client";

import * as React from "react";
import { ImageIcon, Loader2, Plus, Tag, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_LABELS, CATEGORY_ORDER, EU_SIZES, US_SIZES } from "@/lib/data/catalog-meta";
import { PRODUCTS } from "@/lib/data/products";
import { COLOR_FAMILIES } from "@/lib/data/query";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { AdminProduct, Category, Product, SizeVariant } from "@/lib/types";
import { cn } from "@/lib/utils";

const DESKTOP_QUERY = "(min-width: 768px)";

type ProductFormDialogProps = {
  product: AdminProduct | null;
  /** Treat the pre-filled product as a new record instead of an update. */
  duplicate?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (entry: AdminProduct, mode: "created" | "updated") => void;
};

type Draft = {
  name: string;
  slug: string;
  brand: string;
  category: Category;
  gender: Product["gender"];
  color: string;
  colorFamily: string;
  price: string;
  compareAtPrice: string;
  images: string;
  sizes: SizeVariant[];
  tags: Product["tags"];
  shortDescription: string;
  description: string;
  details: string;
  care: string;
};

type DraftErrors = Partial<
  Record<"name" | "slug" | "brand" | "price" | "compareAtPrice" | "images" | "sizes", string>
>;

const TAG_OPTIONS: Product["tags"] = ["new", "bestseller", "limited", "sale"];
const CATEGORY_ITEMS = Object.fromEntries(
  CATEGORY_ORDER.map((category) => [category, CATEGORY_LABELS[category]])
);
const GENDER_ITEMS = { men: "Men", women: "Women", unisex: "Unisex" };
const COLOR_ITEMS: Record<string, string> = {
  multi: "Multi",
  ...Object.fromEntries(COLOR_FAMILIES.map((color) => [color.value, color.label])),
};

function emptyDraft(): Draft {
  return {
    name: "",
    slug: "",
    brand: "",
    category: "sneakers",
    gender: "unisex",
    color: "",
    colorFamily: "",
    price: "",
    compareAtPrice: "",
    images: "",
    sizes: US_SIZES.map((size) => ({ size, stock: 0 })),
    tags: [],
    shortDescription: "",
    description: "",
    details: "",
    care: "",
  };
}

function draftFromProduct(entry: AdminProduct | null): Draft {
  if (!entry) return emptyDraft();
  const p = entry.product;
  return {
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    category: p.category,
    gender: p.gender,
    color: p.color,
    colorFamily: p.colorFamily,
    price: String(p.price),
    compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : "",
    images: p.images.join("\n"),
    sizes: p.sizes.map((size) => ({ ...size })),
    tags: [...p.tags],
    shortDescription: p.shortDescription,
    description: p.description,
    details: p.details.join("\n"),
    care: p.care,
  };
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function linesOf(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function validate(draft: Draft): DraftErrors {
  const errors: DraftErrors = {};
  const price = Number(draft.price);
  const compareAt = Number(draft.compareAtPrice);
  const validSizes = draft.sizes.filter((size) => size.size.trim());
  const normalizedSizes = validSizes.map((size) => size.size.trim().toLowerCase());

  if (!draft.name.trim()) errors.name = "Product name is required.";
  if (!draft.slug.trim()) {
    errors.slug = "Slug is required.";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug.trim())) {
    errors.slug = "Use lowercase letters, numbers and single hyphens only.";
  }
  if (!draft.brand.trim()) errors.brand = "Brand is required.";
  if (!draft.price.trim() || !Number.isFinite(price) || price < 0) {
    errors.price = "Enter a valid price of zero or more.";
  }
  if (
    draft.compareAtPrice.trim() &&
    (!Number.isFinite(compareAt) || compareAt <= price || compareAt < 0)
  ) {
    errors.compareAtPrice = "Compare-at price must be higher than the selling price.";
  }
  if (!linesOf(draft.images).length) {
    errors.images = "Add at least one image path or URL.";
  }
  if (!validSizes.length) {
    errors.sizes = "Add at least one size.";
  } else if (new Set(normalizedSizes).size !== normalizedSizes.length) {
    errors.sizes = "Each size can only appear once.";
  } else if (validSizes.some((size) => !Number.isFinite(size.stock) || size.stock < 0)) {
    errors.sizes = "Stock must be zero or more.";
  }

  return errors;
}

function buildProduct(
  draft: Draft,
  sourceId: string | null,
  existing: AdminProduct | null
): AdminProduct {
  const slug = slugify(draft.slug || draft.name);
  const local = PRODUCTS.find((product) => product.slug === slug);
  const compareAtPrice = Number(draft.compareAtPrice);

  return {
    sourceId,
    product: {
      id:
        local?.id ??
        existing?.product.id ??
        sourceId ??
        `admin_${slug || Date.now().toString(36)}`,
      slug,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      category: draft.category,
      gender: draft.gender,
      color: draft.color.trim() || "Multi",
      colorFamily: draft.colorFamily.trim() || "multi",
      price: Number(draft.price),
      compareAtPrice:
        draft.compareAtPrice.trim() && Number.isFinite(compareAtPrice)
          ? compareAtPrice
          : undefined,
      images: linesOf(draft.images),
      sizes: draft.sizes
        .filter((size) => size.size.trim())
        .map((size) => ({
          size: size.size.trim(),
          stock: Math.max(0, Math.trunc(size.stock)),
        })),
      rating: existing?.product.rating ?? 0,
      reviewCount: existing?.product.reviewCount ?? 0,
      tags: [...draft.tags],
      shortDescription: draft.shortDescription.trim(),
      description: draft.description.trim(),
      details: linesOf(draft.details),
      care: draft.care.trim(),
    },
  };
}

function friendlyError(message: string) {
  if (message.includes("duplicate key") || message.includes("products_slug_key")) {
    return "That slug is already used by another product. Try a different one.";
  }
  if (message.includes("row-level security") || message.includes("permission")) {
    return "Your account doesn't have product permissions. Ask an admin to enable profiles.is_admin.";
  }
  return message;
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-xs text-destructive">{children}</p>;
}

export function ProductFormDialog({
  product,
  duplicate = false,
  open,
  onOpenChange,
  onSaved,
}: ProductFormDialogProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [draft, setDraft] = React.useState<Draft>(() => draftFromProduct(product));
  const [errors, setErrors] = React.useState<DraftErrors>({});
  const [saving, setSaving] = React.useState(false);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(product));

  const imagePreviews = React.useMemo(() => linesOf(draft.images).slice(0, 5), [draft.images]);
  const totalStock = draft.sizes.reduce(
    (sum, size) => sum + (Number.isFinite(size.stock) ? Math.max(0, size.stock) : 0),
    0
  );
  const configured = isSupabaseConfigured();

  const drawerTitle = duplicate ? "Duplicate product" : product ? "Edit product" : "Add product";
  const drawerDescription = duplicate
    ? "A new product pre-filled from this record. Adjust the name and slug before saving."
    : product
      ? configured
        ? "Update the catalogue record. Changes are visible on the storefront immediately."
        : "Update this demo product for the current session. Connect Supabase to persist it."
      : configured
        ? "Create a new catalogue product. Required fields are marked with an asterisk."
        : "Create a demo product for the current session. Connect Supabase to persist it.";

  function update(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors((current) => (Object.keys(current).length ? {} : current));
  }

  function updateName(value: string) {
    setDraft((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : slugify(value),
    }));
    setErrors((current) => (Object.keys(current).length ? {} : current));
  }

  function updateSize(index: number, patch: Partial<SizeVariant>) {
    setDraft((current) => ({
      ...current,
      sizes: current.sizes.map((size, i) => (i === index ? { ...size, ...patch } : size)),
    }));
    setErrors((current) => (Object.keys(current).length ? {} : current));
  }

  function addSize(size = "") {
    setDraft((current) => ({
      ...current,
      sizes: [...current.sizes, { size, stock: 0 }],
    }));
  }

  function addPresetSizes(preset: string[]) {
    setDraft((current) => {
      const existing = new Set(current.sizes.map((size) => size.size));
      return {
        ...current,
        sizes: [
          ...current.sizes,
          ...preset.filter((size) => !existing.has(size)).map((size) => ({ size, stock: 0 })),
        ],
      };
    });
  }

  function removeSize(index: number) {
    setDraft((current) => ({
      ...current,
      sizes: current.sizes.filter((_, i) => i !== index),
    }));
  }

  function toggleTag(tag: Product["tags"][number]) {
    update({
      tags: draft.tags.includes(tag)
        ? draft.tags.filter((item) => item !== tag)
        : [...draft.tags, tag],
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error("Check the highlighted fields before saving.");
      return;
    }

    setSaving(true);
    const cleanSlug = slugify(draft.slug || draft.name);
    const compareAtPrice = Number(draft.compareAtPrice);
    const payload = {
      slug: cleanSlug,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      category: draft.category,
      gender: draft.gender,
      color: draft.color.trim() || null,
      color_family: draft.colorFamily.trim() || null,
      price: Number(draft.price),
      compare_at_price:
        draft.compareAtPrice.trim() && Number.isFinite(compareAtPrice) ? compareAtPrice : null,
      images: linesOf(draft.images),
      sizes: draft.sizes
        .filter((size) => size.size.trim())
        .map((size) => ({
          size: size.size.trim(),
          stock: Math.max(0, Math.trunc(size.stock)),
        })),
      tags: draft.tags,
      rating: !duplicate && product ? product.product.rating : 0,
      review_count: !duplicate && product ? product.product.reviewCount : 0,
      short_description: draft.shortDescription.trim() || null,
      description: draft.description.trim() || null,
      details: linesOf(draft.details),
      care: draft.care.trim() || null,
    };

    try {
      let sourceId = duplicate ? null : (product?.sourceId ?? null);

      if (configured) {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) throw new Error("Supabase client is not available.");

        if (sourceId) {
          const { data, error } = await supabase
            .from("products")
            .update(payload)
            .eq("id", sourceId)
            .select("id")
            .maybeSingle();
          if (error) throw new Error(friendlyError(error.message));
          if (!data) {
            throw new Error(
              "Supabase blocked the update. Check that your account is an admin and try again."
            );
          }
          sourceId = (data as { id: string }).id;
        } else {
          const { data, error } = await supabase
            .from("products")
            .insert(payload)
            .select("id")
            .single();
          if (error) throw new Error(friendlyError(error.message));
          sourceId = (data as { id: string }).id;
        }
      }

      const entry = buildProduct(draft, sourceId, duplicate ? null : product);
      const mode = product && !duplicate ? "updated" : "created";
      onSaved(entry, mode);
      toast.success(mode === "updated" ? "Product updated" : "Product created", {
        description: sourceId
          ? "Saved to Supabase."
          : "Saved in this session only — connect Supabase to persist it.",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not save product", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      swipeDirection={isDesktop ? "right" : "down"}
    >
      <DrawerContent
        side={isDesktop ? "right" : "bottom"}
        showCloseButton={false}
        className={isDesktop ? "[--drawer-content-width:min(560px,90vw)]" : ""}
      >
        <DrawerBody>
          {/* Bottom-sheet drag handle — mobile only */}
          <div className="flex shrink-0 justify-center pt-3 pb-1 md:hidden" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
          </div>

          {/* Header */}
          <header className="flex shrink-0 items-start justify-between gap-3 border-b px-4 pb-4 pt-2 md:px-6 md:py-5">
            <div className="min-w-0">
              <DrawerTitle className="font-heading text-lg font-semibold">
                {drawerTitle}
              </DrawerTitle>
              <DrawerDescription className="mt-0.5 text-xs text-muted-foreground">
                {drawerDescription}
              </DrawerDescription>
            </div>
            <DrawerClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close panel"
                  className="size-9 shrink-0 rounded-full"
                />
              }
            >
              <X className="size-4" aria-hidden />
            </DrawerClose>
          </header>

          {/* Scrollable form body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 [-webkit-overflow-scrolling:touch] md:px-6">
            <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-6">

              {/* ── Basics ── */}
              <section className="flex flex-col gap-4">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Basics
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="product-name">Name *</Label>
                    <Input
                      id="product-name"
                      value={draft.name}
                      onChange={(event) => updateName(event.target.value)}
                      placeholder={'e.g. Air Max 1 \u201CWhite \u00B7 Orange\u201D'}
                      aria-invalid={Boolean(errors.name)}
                    />
                    <FieldError>{errors.name}</FieldError>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="product-slug">Slug *</Label>
                    <Input
                      id="product-slug"
                      value={draft.slug}
                      onChange={(event) => {
                        setSlugTouched(true);
                        update({ slug: event.target.value });
                      }}
                      onBlur={() => {
                        if (!draft.slug.trim()) {
                          setSlugTouched(false);
                          update({ slug: slugify(draft.name) });
                        }
                      }}
                      placeholder="air-max-1-white-orange"
                      aria-invalid={Boolean(errors.slug)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Auto-generated. Edit for a custom URL.
                    </p>
                    <FieldError>{errors.slug}</FieldError>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="product-brand">Brand *</Label>
                    <Input
                      id="product-brand"
                      value={draft.brand}
                      onChange={(event) => update({ brand: event.target.value })}
                      placeholder="Nike"
                      aria-invalid={Boolean(errors.brand)}
                    />
                    <FieldError>{errors.brand}</FieldError>
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Category *</Label>
                    <Select
                      items={CATEGORY_ITEMS}
                      value={draft.category}
                      onValueChange={(value) => update({ category: value as Category })}
                    >
                      <SelectTrigger className="w-full" aria-label="Category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_ORDER.map((category) => (
                          <SelectItem key={category} value={category}>
                            {CATEGORY_LABELS[category]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Gender *</Label>
                    <Select
                      items={GENDER_ITEMS}
                      value={draft.gender}
                      onValueChange={(value) => update({ gender: value as Product["gender"] })}
                    >
                      <SelectTrigger className="w-full" aria-label="Gender">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="men">Men</SelectItem>
                        <SelectItem value="women">Women</SelectItem>
                        <SelectItem value="unisex">Unisex</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="product-color">Colour</Label>
                    <Input
                      id="product-color"
                      value={draft.color}
                      onChange={(event) => update({ color: event.target.value })}
                      placeholder="White / Bright Mandarin"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Colour family</Label>
                    <Select
                      items={COLOR_ITEMS}
                      value={draft.colorFamily || "multi"}
                      onValueChange={(value) => update({ colorFamily: value as string })}
                    >
                      <SelectTrigger className="w-full" aria-label="Colour family">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multi">Multi</SelectItem>
                        {draft.colorFamily && !COLOR_ITEMS[draft.colorFamily] && (
                          <SelectItem value={draft.colorFamily}>{draft.colorFamily}</SelectItem>
                        )}
                        {COLOR_FAMILIES.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            {color.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="product-price">Price (USD) *</Label>
                    <Input
                      id="product-price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={draft.price}
                      onChange={(event) => update({ price: event.target.value })}
                      placeholder="149"
                      aria-invalid={Boolean(errors.price)}
                    />
                    <FieldError>{errors.price}</FieldError>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="product-compare-price">Compare-at price</Label>
                    <Input
                      id="product-compare-price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={draft.compareAtPrice}
                      onChange={(event) => update({ compareAtPrice: event.target.value })}
                      placeholder="Optional — shows a sale badge"
                      aria-invalid={Boolean(errors.compareAtPrice)}
                    />
                    <FieldError>{errors.compareAtPrice}</FieldError>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {TAG_OPTIONS.map((tag) => (
                      <label
                        key={tag}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                          draft.tags.includes(tag)
                            ? "border-foreground/20 bg-foreground text-background"
                            : "bg-background hover:bg-muted"
                        )}
                      >
                        <Checkbox
                          checked={draft.tags.includes(tag)}
                          onCheckedChange={() => toggleTag(tag)}
                          className={cn(
                            "border-current/30 bg-transparent",
                            draft.tags.includes(tag) && "border-transparent bg-background/20"
                          )}
                        />
                        <Tag className="size-3" aria-hidden />
                        {tag}
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              {/* ── Media & story ── */}
              <section className="flex flex-col gap-4 border-t pt-5">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Media & story
                </p>

                <div className="grid gap-1.5">
                  <Label htmlFor="product-images">Images *</Label>
                  <Textarea
                    id="product-images"
                    rows={3}
                    value={draft.images}
                    onChange={(event) => update({ images: event.target.value })}
                    placeholder={"/img/products/am1-orange-white.jpg\nhttps://example.com/photo.jpg"}
                    aria-invalid={Boolean(errors.images)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    One image path or URL per line. First image is used on cards.
                  </p>
                  <FieldError>{errors.images}</FieldError>
                  {imagePreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {imagePreviews.map((src, index) => (
                        <span
                          key={`${src}-${index}`}
                          className="flex size-14 items-center justify-center overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/5"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="size-full object-cover" />
                        </span>
                      ))}
                      {linesOf(draft.images).length > imagePreviews.length && (
                        <span className="flex size-14 items-center justify-center rounded-xl bg-muted text-[11px] font-medium text-muted-foreground">
                          +{linesOf(draft.images).length - imagePreviews.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="product-short-description">Short description</Label>
                  <Textarea
                    id="product-short-description"
                    rows={2}
                    value={draft.shortDescription}
                    onChange={(event) => update({ shortDescription: event.target.value })}
                    placeholder="One-line summary shown on product cards."
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="product-description">Description</Label>
                  <Textarea
                    id="product-description"
                    rows={5}
                    value={draft.description}
                    onChange={(event) => update({ description: event.target.value })}
                    placeholder="The full product story."
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="product-details">Details</Label>
                  <Textarea
                    id="product-details"
                    rows={4}
                    value={draft.details}
                    onChange={(event) => update({ details: event.target.value })}
                    placeholder={"Visible Air sole unit\nSuede + mesh upper\nRubber outsole"}
                  />
                  <p className="text-[11px] text-muted-foreground">One detail per line.</p>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="product-care">Care</Label>
                  <Textarea
                    id="product-care"
                    rows={2}
                    value={draft.care}
                    onChange={(event) => update({ care: event.target.value })}
                    placeholder="Wipe with a soft, damp cloth."
                  />
                </div>
              </section>

              {/* ── Sizes & stock ── */}
              <section className="flex flex-col gap-3 border-t pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                      Sizes & stock
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {totalStock} units across{" "}
                      {draft.sizes.filter((size) => size.size.trim()).length} sizes
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button type="button" variant="outline" size="sm" onClick={() => addSize()}>
                      <Plus data-icon="inline-start" aria-hidden />
                      Add size
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addPresetSizes(US_SIZES)}
                    >
                      US sizes
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addPresetSizes(EU_SIZES)}
                    >
                      EU sizes
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {draft.sizes.map((size, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[minmax(0,1fr)_5.5rem_auto] items-center gap-2 sm:grid-cols-[1fr_7rem_auto]"
                    >
                      <Input
                        value={size.size}
                        onChange={(event) => updateSize(index, { size: event.target.value })}
                        placeholder="US 9"
                        aria-label={`Size ${index + 1}`}
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        value={size.stock}
                        onChange={(event) =>
                          updateSize(index, { stock: Number(event.target.value) || 0 })
                        }
                        aria-label={`Stock for ${size.size || `size ${index + 1}`}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeSize(index)}
                        aria-label={`Remove ${size.size || `size ${index + 1}`}`}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  ))}
                  {!draft.sizes.length && (
                    <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-4 text-xs text-muted-foreground">
                      <ImageIcon className="size-4" aria-hidden />
                      No sizes yet. Add a size or start from the US/EU presets.
                    </div>
                  )}
                  <FieldError>{errors.sizes}</FieldError>
                </div>
              </section>

            </form>
          </div>

          {/* Sticky footer — always visible, form submits via id */}
          <footer className="shrink-0 border-t bg-popover/95 px-4 py-4 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="product-form"
                disabled={saving}
                className="rounded-full px-6"
              >
                {saving && <Loader2 className="animate-spin" aria-hidden />}
                {product && !duplicate ? "Save changes" : "Create product"}
              </Button>
            </div>
          </footer>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
