"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Heart, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { discountPercent, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-0.5", className)} aria-label={`Rated ${rating} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3",
            i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/25"
          )}
          aria-hidden
        />
      ))}
    </span>
  );
}

type CompareProps = {
  compareMode?: boolean;
  compareSelected?: boolean;
  onToggleCompare?: () => void;
};

const sizeLabel = (size: string) => size.replace("US ", "").replace("EU ", "");

export function ProductCard({
  product,
  priority,
  compareMode,
  compareSelected,
  onToggleCompare,
}: { product: Product; priority?: boolean } & CompareProps) {
  const { addItem, removeLine, lines } = useCart();
  const { has, toggle } = useWishlist();
  const discount = discountPercent(product.price, product.compareAtPrice);
  const salePercent = discount && discount > 0 ? discount : null;
  const liked = has(product.id);
  const inStockSizes = product.sizes.filter((s) => s.stock > 0);
  const compareActive = Boolean(compareMode && onToggleCompare);
  const hoverImage = product.images[1];
  const [hovered, setHovered] = React.useState(false);
  const [hoverImageBroken, setHoverImageBroken] = React.useState(false);

  // Sizes of this product currently in the bag: size -> quantity
  const inBag = React.useMemo(
    () =>
      new Map(
        lines
          .filter((l) => l.productId === product.id)
          .map((l) => [l.size, l.quantity])
      ),
    [lines, product.id]
  );
  const totalInBag = [...inBag.values()].reduce((sum, q) => sum + q, 0);
  const defaultSize = inStockSizes[0]?.size ?? null;

  function quickToggle(product: Product, size: string) {
    const qtyInBag = inBag.get(size);
    if (qtyInBag) {
      removeLine(`${product.id}::${size}`);
      toast("Removed from bag", { description: `${product.name} · ${size}` });
    } else {
      addItem(product, size);
      toast.success("Added to bag", { description: `${product.name} · ${size}` });
    }
  }

  return (
    <div
      className="group relative flex flex-col"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      {/* ── Media ───────────────────────────────────────────── */}
      <div className="relative">
        <Link
          href={`/products/${product.slug}`}
          className={cn(
            "zoom-container relative block aspect-[3/4] overflow-hidden rounded-lg bg-muted sm:rounded-lg",
            compareSelected && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
          )}
          aria-label={`View ${product.name}`}
        >
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className="object-cover"
          />
          {hoverImage && hovered && !hoverImageBroken && (
            <Image
              src={hoverImage}
              alt=""
              aria-hidden
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              onError={() => setHoverImageBroken(true)}
              className="animate-in fade-in-0 object-cover duration-300"
            />
          )}
        </Link>

        {/* Compare mode — the image becomes a large, accessible selection target. */}
        {compareActive && (
          <button
            type="button"
            onClick={onToggleCompare}
            aria-pressed={!!compareSelected}
            aria-label={
              compareSelected
                ? `Remove ${product.name} from comparison`
                : `Select ${product.name} for comparison`
            }
            className="absolute inset-0 z-[5] cursor-pointer rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:rounded-2xl"
          >
            <span
              className={cn(
                "pointer-events-none absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold shadow-lg ring-1 backdrop-blur-md transition-colors",
                compareSelected
                  ? "bg-foreground text-background ring-foreground"
                  : "bg-background/95 text-foreground ring-black/10 dark:ring-white/15"
              )}
            >
              {compareSelected ? (
                <Check className="size-3.5" aria-hidden />
              ) : (
                <Plus className="size-3.5" aria-hidden />
              )}
              {compareSelected ? "Selected" : "Compare"}
            </span>
          </button>
        )}

        {/* Top-left tags */}
        <div className="pointer-events-none absolute top-2.5 left-2.5 z-[6] flex flex-col items-start gap-1 sm:top-3 sm:left-3">
          {salePercent !== null && (
            <span className="inline-flex h-5 items-center rounded-md bg-red-600 px-1.5 text-[10px] font-bold text-white shadow-sm sm:text-[11px]">
              −{salePercent}%
            </span>
          )}
          {product.tags.includes("new") && (
            <span className="inline-flex h-5 items-center rounded-md bg-background/95 px-1.5 text-[10px] font-bold tracking-wide text-foreground uppercase shadow-sm backdrop-blur">
              New
            </span>
          )}
          {product.tags.includes("limited") && (
            <span className="inline-flex h-5 items-center rounded-md border border-black/10 bg-background/85 px-1.5 text-[10px] font-bold tracking-wide text-foreground uppercase shadow-sm backdrop-blur dark:border-white/15">
              Limited
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          type="button"
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={liked}
          onClick={() => {
            const added = toggle(product.id);
            if (added) toast.success("Saved to wishlist", { description: product.name });
          }}
          className="absolute top-2.5 right-2.5 z-10 grid size-8 place-items-center rounded-full bg-background/90 shadow-[0_2px_10px_rgba(0,0,0,0.15)] ring-1 ring-black/5 backdrop-blur transition-all duration-200 hover:scale-105 active:scale-90 sm:top-3 sm:right-3 sm:size-9 md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:translate-y-0 md:focus-visible:opacity-100 dark:ring-white/10"
        >
          <Heart
            className={cn(
              "size-[18px]",
              liked ? "fill-red-500 text-red-500" : "text-foreground/80"
            )}
            strokeWidth={1.9}
            aria-hidden
          />
          {liked && <span className="sr-only">Saved</span>}
        </button>

        {/* Mobile quick add/remove — first in-stock size */}
        {!compareActive && defaultSize && (
          <button
            type="button"
            aria-label={
              inBag.has(defaultSize)
                ? `In bag (${inBag.get(defaultSize)}) · ${defaultSize} — remove from bag`
                : `Quick add ${defaultSize} to bag`
            }
            onClick={() => defaultSize && quickToggle(product, defaultSize)}
            className="absolute right-2.5 bottom-2.5 z-10 grid size-9 place-items-center rounded-full bg-foreground text-background shadow-[0_4px_14px_rgba(0,0,0,0.25)] transition-transform active:scale-90 md:hidden"
          >
            {inBag.has(defaultSize) ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Plus className="size-4" aria-hidden />
            )}
            {inBag.get(defaultSize)! > 1 && (
              <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-background text-[9px] font-bold text-foreground ring-1 ring-black/10">
                {inBag.get(defaultSize)}
              </span>
            )}
          </button>
        )}

        {/* Desktop quick add/remove — chips toggle: filled = in bag */}
        {!compareActive && inStockSizes.length > 0 && (
          <div className="pointer-events-none absolute inset-x-2.5 bottom-2.5 z-10 hidden translate-y-2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 md:block">
            <div className="rounded-xl bg-background/95 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)] ring-1 ring-black/5 backdrop-blur-md dark:ring-white/10">
              <div className="flex items-center justify-between gap-2 px-1 pb-1">
                <span className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                  {totalInBag > 0 ? `${totalInBag} in bag` : "Quick add"}
                </span>
                <span className="text-[10px] text-muted-foreground/70">
                  {inStockSizes.length} {inStockSizes.length === 1 ? "size" : "sizes"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {product.sizes.map((s) => {
                  const qty = inBag.get(s.size) ?? 0;
                  return (
                    <button
                      key={s.size}
                      type="button"
                      disabled={s.stock === 0}
                      onClick={() => quickToggle(product, s.size)}
                      aria-label={
                        s.stock === 0
                          ? `${s.size} unavailable`
                          : qty
                            ? `In bag ×${qty} · ${s.size} — tap to remove`
                            : `Add ${s.size} to bag`
                      }
                      className={cn(
                        "relative grid h-7 min-w-7 place-items-center rounded-full border px-1.5 text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
                        s.stock === 0
                          ? "cursor-not-allowed border-transparent text-muted-foreground/35 line-through"
                          : qty
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background hover:border-foreground hover:bg-foreground hover:text-background"
                      )}
                    >
                      {sizeLabel(s.size)}
                      {qty > 1 && (
                        <span className="absolute -top-1.5 -right-1.5 grid size-3.5 place-items-center rounded-full bg-background text-[8px] font-bold text-foreground ring-1 ring-black/15">
                          {qty}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Info ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 pt-2.5 sm:pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
            {product.brand}
          </p>
          <span
            className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground"
            aria-label={`Rated ${product.rating} of 5 from ${product.reviewCount} reviews`}
          >
            <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
            <span className="text-foreground/80">{product.rating}</span>
            <span className="text-muted-foreground/60">({product.reviewCount})</span>
          </span>
        </div>

        <Link
          href={`/products/${product.slug}`}
          className="line-clamp-2 min-h-[2.75em] text-[13px] leading-snug transition-colors hover:text-muted-foreground sm:text-sm"
        >
          {product.name}
        </Link>

        <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="text-[15px] font-bold tracking-tight text-foreground sm:text-base">
            {formatPrice(product.price)}
          </span>
          {salePercent !== null && (
            <span className="text-[11px] text-muted-foreground line-through sm:text-xs">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Compact horizontal card used by the catalogue's list view. */
export function ProductListCard({
  product,
  priority,
  compareMode,
  compareSelected,
  onToggleCompare,
}: { product: Product; priority?: boolean } & CompareProps) {
  const { addItem, removeLine, lines } = useCart();
  const { has, toggle } = useWishlist();
  const discount = discountPercent(product.price, product.compareAtPrice);
  const salePercent = discount && discount > 0 ? discount : null;
  const liked = has(product.id);
  const compareActive = Boolean(compareMode && onToggleCompare);

  const inBag = React.useMemo(
    () =>
      new Map(
        lines.filter((line) => line.productId === product.id).map((line) => [line.size, line.quantity])
      ),
    [lines, product.id]
  );

  function quickToggle(size: string) {
    const qtyInBag = inBag.get(size);
    if (qtyInBag) {
      removeLine(`${product.id}::${size}`);
      toast("Removed from bag", { description: `${product.name} · ${size}` });
    } else {
      addItem(product, size);
      toast.success("Added to bag", { description: `${product.name} · ${size}` });
    }
  }

  return (
    <article
      className={cn(
        "group relative flex gap-3 overflow-hidden rounded-2xl border bg-card p-2.5 transition-all duration-300 sm:gap-5 sm:p-3",
        compareSelected
          ? "border-foreground/60 shadow-sm ring-2 ring-foreground/10"
          : "hover:border-foreground/15 hover:shadow-[0_18px_50px_rgba(0,0,0,0.07)]"
      )}
    >
      <div className="relative shrink-0">
        <Link
          href={`/products/${product.slug}`}
          className={cn(
            "zoom-container relative block aspect-[3/4] w-24 overflow-hidden rounded-xl bg-muted sm:w-36 lg:w-40",
            compareSelected && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
          )}
          aria-label={`View ${product.name}`}
        >
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 96px, (max-width: 1024px) 144px, 160px"
            priority={priority}
            className="object-cover"
          />
        </Link>
        {salePercent !== null && (
          <span className="pointer-events-none absolute top-2 left-2 inline-flex h-5 items-center rounded-md bg-red-600 px-1.5 text-[10px] font-bold text-white shadow-sm">
            −{salePercent}%
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
              {product.brand}
            </p>
            <Link
              href={`/products/${product.slug}`}
              className="mt-1 line-clamp-2 text-sm leading-snug transition-colors hover:text-muted-foreground sm:text-base"
            >
              {product.name}
            </Link>
          </div>
          <button
            type="button"
            aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={liked}
            onClick={() => {
              const added = toggle(product.id);
              if (added) toast.success("Saved to wishlist", { description: product.name });
            }}
            className="grid size-8 shrink-0 place-items-center rounded-full border bg-background transition-all duration-200 hover:border-foreground/30 hover:scale-105 active:scale-90 sm:size-9"
          >
            <Heart
              className={cn(
                "size-4",
                liked ? "fill-red-500 text-red-500" : "text-foreground/80"
              )}
              strokeWidth={1.9}
              aria-hidden
            />
          </button>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Stars rating={product.rating} />
          <span className="text-[11px] text-muted-foreground">
            {product.rating} ({product.reviewCount})
          </span>
          <span className="text-muted-foreground/40" aria-hidden>
            ·
          </span>
          <span className="text-[11px] text-muted-foreground">{product.color}</span>
        </div>

        <p className="mt-2 hidden text-xs leading-relaxed text-muted-foreground sm:line-clamp-2">
          {product.shortDescription}
        </p>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            {formatPrice(product.price)}
          </span>
          {salePercent !== null && (
            <>
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice!)}
              </span>
              <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-500/10">
                {salePercent}% OFF
              </span>
            </>
          )}
        </div>

        <div className="mt-auto pt-3">
          {compareActive ? (
            <button
              type="button"
              onClick={onToggleCompare}
              aria-pressed={!!compareSelected}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                compareSelected
                  ? "border-foreground bg-foreground text-background"
                  : "bg-background hover:border-foreground/30 hover:bg-muted"
              )}
            >
              {compareSelected ? (
                <Check className="size-3.5" aria-hidden />
              ) : (
                <Plus className="size-3.5" aria-hidden />
              )}
              {compareSelected ? "Selected for comparison" : "Select to compare"}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                Quick add
              </span>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Sizes for ${product.name}`}>
                {product.sizes.map((size) => {
                  const qty = inBag.get(size.size) ?? 0;
                  return (
                    <button
                      key={size.size}
                      type="button"
                      disabled={size.stock === 0}
                      onClick={() => quickToggle(size.size)}
                      aria-label={
                        size.stock === 0
                          ? `${size.size} unavailable`
                          : qty
                            ? `In bag ×${qty} · ${size.size} — tap to remove`
                            : `Add ${size.size} to bag`
                      }
                      className={cn(
                        "relative grid h-7 min-w-7 place-items-center rounded-full border px-1.5 text-[11px] transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                        size.stock === 0
                          ? "cursor-not-allowed border-transparent text-muted-foreground/35 line-through"
                          : qty
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background hover:border-foreground hover:bg-foreground hover:text-background"
                      )}
                    >
                      {sizeLabel(size.size)}
                      {qty > 1 && (
                        <span className="absolute -top-1.5 -right-1.5 grid size-3.5 place-items-center rounded-full bg-background text-[8px] font-bold text-foreground ring-1 ring-black/15">
                          {qty}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export { Stars };
