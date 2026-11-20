"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GitCompareArrows, MoveHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATEGORY_LABELS } from "@/lib/data/catalog-meta";
import { discountPercent, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export const COMPARE_LIMIT = 3;

type CompareTrayProps = {
  products: Product[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onCompare: () => void;
};

/** Floating tray that keeps the comparison selection one tap away. */
export function CompareTray({ products, onRemove, onClear, onCompare }: CompareTrayProps) {
  if (products.length === 0) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 md:inset-x-auto md:right-6 md:bottom-6 md:w-[23rem]">
      <div className="rounded-2xl border bg-popover/95 p-3 shadow-2xl ring-1 ring-foreground/5 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            <GitCompareArrows className="size-3.5" aria-hidden />
            Compare
            <span className="text-foreground tabular-nums">
              {products.length}/{COMPARE_LIMIT}
            </span>
          </p>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            Clear
          </button>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {products.map((product) => (
              <div key={product.id} className="relative size-11 shrink-0">
                <div className="size-full overflow-hidden rounded-lg border bg-muted">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(product.id)}
                  aria-label={`Remove ${product.name} from comparison`}
                  className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-popover bg-foreground text-background shadow-sm transition-colors after:absolute after:-inset-2 hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </div>
            ))}
            {Array.from({ length: Math.max(0, COMPARE_LIMIT - products.length) }, (_, index) => (
              <span
                key={`empty-${index}`}
                aria-hidden
                className="flex size-11 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground/40"
              >
                +
              </span>
            ))}
          </div>

          <Button
            size="sm"
            className="ml-auto h-10 flex-1 rounded-full"
            disabled={products.length < 2}
            onClick={onCompare}
          >
            Compare <ArrowRight aria-hidden />
          </Button>
        </div>

        {products.length < 2 && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            Pick at least two shoes to see them side by side.
          </p>
        )}
      </div>
    </div>
  );
}

type CompareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

/** Full comparison table — horizontally scrollable with a pinned label column. */
export function CompareDialog({
  open,
  onOpenChange,
  products,
  onRemove,
  onClear,
}: CompareDialogProps) {
  const rows: { label: string; render: (product: Product) => React.ReactNode }[] = [
    {
      label: "Price",
      render: (product) => {
        const discount = discountPercent(product.price, product.compareAtPrice);
        return (
          <div className="flex flex-wrap items-baseline gap-2">
            <span className={cn("font-semibold", discount && "text-red-600")}>
              {formatPrice(product.price)}
            </span>
            {discount && (
              <>
                <span className="text-xs text-muted-foreground line-through">
                  {formatPrice(product.compareAtPrice!)}
                </span>
                <Badge className="rounded-full bg-red-600 text-white">−{discount}%</Badge>
              </>
            )}
          </div>
        );
      },
    },
    { label: "Brand", render: (product) => product.brand },
    { label: "Category", render: (product) => CATEGORY_LABELS[product.category] },
    { label: "Colour", render: (product) => product.color },
    {
      label: "Rating",
      render: (product) => `${product.rating.toFixed(1)} / 5 · ${product.reviewCount} reviews`,
    },
    {
      label: "Available sizes",
      render: (product) => {
        const sizes = product.sizes.filter((size) => size.stock > 0);
        return sizes.length > 0 ? sizes.map((size) => size.size).join(" · ") : "Sold out";
      },
    },
    {
      label: "Sale",
      render: (product) =>
        product.compareAtPrice ? (
          <span className="text-emerald-600">On sale</span>
        ) : (
          <span className="text-muted-foreground">Not on sale</span>
        ),
    },
    {
      label: "Style notes",
      render: (product) => (
        <span className="text-xs leading-relaxed text-muted-foreground">
          {product.shortDescription}
        </span>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl">
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14 sm:px-6">
          <DialogTitle className="font-heading text-lg font-semibold sm:text-xl">
            Compare shoes
          </DialogTitle>
          <DialogDescription>
            {products.length} pairs side by side — price, fit, colour and availability.
          </DialogDescription>
        </DialogHeader>

        <p className="flex shrink-0 items-center gap-1.5 border-b bg-muted/40 px-5 py-2 text-[11px] text-muted-foreground sm:hidden">
          <MoveHorizontal className="size-3.5 shrink-0" aria-hidden />
          Swipe the table sideways to compare every pair
        </p>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-28 bg-popover p-3 text-left align-bottom text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
                >
                  Shoe
                </th>
                {products.map((product) => (
                  <th
                    key={product.id}
                    scope="col"
                    className="min-w-[170px] border-l p-3 text-left align-top font-normal"
                  >
                    <div className="flex items-start gap-2.5">
                      <Link
                        href={`/products/${product.slug}`}
                        className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted"
                      >
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </Link>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                          {product.brand}
                        </p>
                        <Link
                          href={`/products/${product.slug}`}
                          className="line-clamp-2 text-xs leading-snug font-medium hover:underline"
                        >
                          {product.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => onRemove(product.id)}
                          className="mt-1 text-[10px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-popover p-3 text-left align-top text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
                  >
                    {row.label}
                  </th>
                  {products.map((product) => (
                    <td key={product.id} className="border-l p-3 align-top text-sm">
                      {row.render(product)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-5 py-3">
          <button
            type="button"
            onClick={onClear}
            className="rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            Clear comparison
          </button>
          <DialogClose render={<Button className="rounded-full" />}>Done</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
