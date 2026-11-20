"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { Stars } from "@/components/storefront/product-card";
import { discountPercent, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WishlistClient({ products }: { products: Product[] }) {
  const { ids, toggle, clear, hydrated, syncing, signedIn } = useWishlist();
  const { addItem } = useCart();

  const productById = React.useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const savedProducts = React.useMemo(() => {
    const seen = new Set<string>();
    const saved: Product[] = [];

    for (const id of ids) {
      const product = productById.get(id);
      if (!product || seen.has(product.slug)) continue;
      seen.add(product.slug);
      saved.push(product);
    }

    return saved;
  }, [ids, productById]);

  if (!hydrated) return <WishlistLoading />;

  if (savedProducts.length === 0) {
    if (syncing) return <WishlistLoading message="Checking your saved pairs…" />;

    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted sm:size-20">
          <Heart className="size-7 text-muted-foreground sm:size-8" aria-hidden />
        </span>
        <h1 className="font-heading mt-5 max-w-xs text-2xl font-semibold tracking-tight text-balance sm:mt-6 sm:text-3xl">
          Your wishlist is empty
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {signedIn
            ? "Tap the heart on any product to save it here. Your wishlist is synced to your account."
            : "Tap the heart on any product to save it here — it stays on this device even after restarting the browser."}
        </p>
        <Link
          href="/products"
          className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full max-w-xs rounded-full sm:w-auto")}
        >
          Discover shoes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-20 sm:px-6 sm:pt-6 sm:pb-24 lg:px-8">
      <header className="mb-5 sm:mb-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          Saved for later
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-5xl">
            Wishlist
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 h-9 rounded-full px-3 text-muted-foreground sm:mr-0"
            onClick={() => {
              clear();
              toast.success("Wishlist cleared");
            }}
          >
            Clear list
          </Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {savedProducts.length} saved {savedProducts.length === 1 ? "pair" : "pairs"} ·{" "}
          {syncing
            ? "syncing…"
            : signedIn
              ? "synced to your account"
              : "stored on this device"}
        </p>
      </header>

      <ul className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {savedProducts.map((p) => {
          const discount = discountPercent(p.price, p.compareAtPrice);
          const firstSize = p.sizes.find((s) => s.stock > 0);
          const actions = (
            <>
              <Button
                size="sm"
                className="h-10 w-full rounded-full sm:h-8 sm:w-auto"
                disabled={!firstSize}
                onClick={() => {
                  if (!firstSize) return;
                  addItem(p, firstSize.size);
                  toast.success("Added to bag", {
                    description: `${p.name} · ${firstSize.size}`,
                  });
                }}
              >
                <ShoppingBag aria-hidden />
                Add to bag
              </Button>
              <Link
                href={`/products/${p.slug}`}
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "h-10 w-full rounded-full sm:h-8 sm:w-auto"
                )}
              >
                Details
              </Link>
            </>
          );

          return (
            <li key={p.id} className="rounded-2xl border bg-card p-3 sm:p-4">
              <div className="flex gap-3 sm:gap-5">
                <div className="relative w-24 shrink-0 sm:w-32 lg:w-40">
                  <Link
                    href={`/products/${p.slug}`}
                    className="zoom-container relative block aspect-square overflow-hidden rounded-xl bg-muted"
                  >
                    <Image
                      src={p.images[0]}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 96px, (max-width: 1024px) 128px, 160px"
                      className="object-cover"
                    />
                  </Link>
                  <button
                    aria-label={`Remove ${p.name} from wishlist`}
                    onClick={() => {
                      toggle(p.id);
                      toast.success("Removed from wishlist");
                    }}
                    className="absolute top-1.5 right-1.5 flex size-8 items-center justify-center rounded-full bg-white/85 shadow-sm ring-1 ring-foreground/10 backdrop-blur transition-transform hover:scale-105 active:scale-90 sm:top-2 sm:right-2 sm:size-9"
                  >
                    <Heart className="size-4 fill-red-500 text-red-500" aria-hidden />
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {p.brand}
                  </p>
                  <Link
                    href={`/products/${p.slug}`}
                    className="line-clamp-2 text-sm leading-snug font-medium hover:underline sm:text-base"
                  >
                    {p.name}
                  </Link>
                  <Stars rating={p.rating} className="mt-1" />
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className={discount ? "font-semibold text-red-600" : "font-semibold"}>
                      {formatPrice(p.price)}
                    </span>
                    {discount && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(p.compareAtPrice!)}
                      </span>
                    )}
                    <Badge variant="outline" className="rounded-full text-[10px] capitalize">
                      {p.colorFamily}
                    </Badge>
                  </div>
                  <div className="mt-auto hidden items-center gap-2 pt-3 sm:flex">{actions}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">{actions}</div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WishlistLoading({ message = "Loading your saved pairs…" }: { message?: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-10 w-48" />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      <div className="mt-7 grid gap-3 sm:gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex gap-4 rounded-2xl border bg-card p-4">
            <Skeleton className="aspect-square w-28 shrink-0 rounded-xl sm:w-32" />
            <div className="flex flex-1 flex-col gap-2 py-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-auto h-8 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
