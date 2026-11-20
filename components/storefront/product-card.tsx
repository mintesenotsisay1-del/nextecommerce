"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Heart, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
  const liked = has(product.id);
  const inStockSizes = product.sizes.filter((s) => s.stock > 0);
  const compareActive = Boolean(compareMode && onToggleCompare);

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
    <div className="group relative flex flex-col">
      <Link
        href={`/products/${product.slug}`}
        className={cn(
          "zoom-container relative block aspect-[4/5] overflow-hidden rounded-2xl bg-muted",
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
          className="absolute inset-x-0 top-0 z-[5] aspect-[4/5] cursor-pointer rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span
            className={cn(
              "pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-sm ring-1 backdrop-blur transition-colors",
              compareSelected
                ? "bg-foreground text-background ring-foreground"
                : "bg-white/90 text-foreground ring-foreground/10"
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
      <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
        {product.tags.includes("new") && <Badge className="rounded-full bg-foreground text-background">New</Badge>}
        {discount && (
          <Badge className="rounded-full bg-red-600 text-white">−{discount}%</Badge>
        )}
        {product.tags.includes("limited") && (
          <Badge variant="outline" className="rounded-full bg-white/85 backdrop-blur">
            Limited
          </Badge>
        )}
      </div>

      {/* Wishlist */}
      <button
        aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={liked}
        onClick={() => {
          const added = toggle(product.id);
          if (added) toast.success("Saved to wishlist", { description: product.name });
        }}
        className="absolute top-2.5 right-2.5 z-10 flex size-9 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur transition-transform active:scale-90 hover:scale-110 md:-translate-y-1 md:opacity-0 md:transition-all md:group-hover:translate-y-0 md:group-hover:opacity-100"
      >
        <Heart
          className={cn("size-4", liked ? "fill-red-500 text-red-500" : "text-foreground")}
          aria-hidden
        />
        {liked && <span className="sr-only">Saved</span>}
      </button>

      {/* Mobile quick add/remove — always visible pill, first in-stock size */}
      {!compareActive && defaultSize && (
        <button
          aria-label={
            inBag.has(defaultSize)
              ? `In bag (${inBag.get(defaultSize)}) · ${defaultSize} — remove from bag`
              : `Quick add ${defaultSize} to bag`
          }
          onClick={() => defaultSize && quickToggle(product, defaultSize)}
          className="absolute right-2 bottom-2 z-10 flex size-9 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-foreground/10 backdrop-blur transition-transform active:scale-90 md:hidden"
        >
          {inBag.has(defaultSize) ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
          {inBag.get(defaultSize)! > 1 && (
            <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-foreground text-[8px] font-bold text-background">
              {inBag.get(defaultSize)}
            </span>
          )}
        </button>
      )}

      {/* Quick add/remove (desktop hover) — chips toggle: filled = in bag */}
      {!compareActive && inStockSizes.length > 0 && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 hidden translate-y-2 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 md:block">
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-white/95 p-2 shadow-lg ring-1 ring-foreground/10 backdrop-blur">
            <span className="pl-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {totalInBag > 0 ? `${totalInBag} in bag` : "Quick add"}
            </span>
            {product.sizes.map((s) => {
              const qty = inBag.get(s.size) ?? 0;
              return (
                <button
                  key={s.size}
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
                    "relative min-w-8 rounded-lg border px-1.5 py-1 text-xs font-medium transition-colors",
                    s.stock === 0
                      ? "cursor-not-allowed text-muted-foreground/40 line-through"
                      : qty
                        ? "border-foreground bg-foreground text-background hover:border-red-600 hover:bg-red-600"
                        : "hover:bg-foreground hover:text-background"
                  )}
                >
                  {s.size.replace("US ", "").replace("EU ", "")}
                  {qty > 1 && (
                    <span className="absolute -top-1.5 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-white text-[8px] font-bold text-foreground ring-1 ring-foreground/20">
                      {qty}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex flex-col gap-1 pt-2 sm:pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase sm:text-[11px]">
            {product.brand}
          </p>
        </div>
        <Link
          href={`/products/${product.slug}`}
          className="text-[13px] leading-snug font-medium hover:underline sm:text-sm"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-2 text-[13px] sm:text-sm">
          <span className={cn("font-semibold", discount && "text-red-600")}>
            {formatPrice(product.price)}
          </span>
          {discount && (
            <span className="text-xs text-muted-foreground line-through">
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
        "group relative flex gap-3 rounded-2xl border bg-card p-2.5 transition-colors sm:gap-5 sm:p-3",
        compareSelected ? "border-foreground/50" : "hover:border-foreground/20"
      )}
    >
      <Link
        href={`/products/${product.slug}`}
        className={cn(
          "zoom-container relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-36 lg:w-40",
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
        {discount && (
          <Badge className="absolute top-2 left-2 rounded-full bg-red-600 text-white">
            −{discount}%
          </Badge>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {product.brand}
            </p>
            <Link
              href={`/products/${product.slug}`}
              className="mt-0.5 line-clamp-2 text-sm leading-snug font-medium hover:underline sm:text-base"
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
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted/60 transition-transform active:scale-90 hover:scale-105"
          >
            <Heart
              className={cn("size-4", liked ? "fill-red-500 text-red-500" : "text-foreground")}
              aria-hidden
            />
          </button>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11px] text-muted-foreground">
            {product.rating} · {product.reviewCount} reviews
          </span>
        </div>

        <p className="mt-1.5 hidden text-xs leading-relaxed text-muted-foreground sm:line-clamp-2">
          {product.shortDescription}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={cn("text-sm font-semibold", discount && "text-red-600")}>
            {formatPrice(product.price)}
          </span>
          {discount && (
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            {product.color}
          </span>
        </div>

        <div className="mt-auto pt-3">
          {compareActive ? (
            <button
              type="button"
              onClick={onToggleCompare}
              aria-pressed={!!compareSelected}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                compareSelected
                  ? "border-foreground bg-foreground text-background"
                  : "hover:bg-muted"
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
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 hidden text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:inline">
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
                        "relative min-w-8 rounded-lg border px-1.5 py-1 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                        size.stock === 0
                          ? "cursor-not-allowed text-muted-foreground/40 line-through"
                          : qty
                            ? "border-foreground bg-foreground text-background hover:border-red-600 hover:bg-red-600"
                            : "hover:bg-foreground hover:text-background"
                      )}
                    >
                      {size.size.replace("US ", "").replace("EU ", "")}
                      {qty > 1 && (
                        <span className="absolute -top-1.5 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-white text-[8px] font-bold text-foreground ring-1 ring-foreground/20">
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
