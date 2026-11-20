"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Heart,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { ProductCard } from "@/components/storefront/product-card";
import { PRODUCTS } from "@/lib/data/products";
import { formatPrice } from "@/lib/format";
import type { CartLine } from "@/lib/types";
import { cn } from "@/lib/utils";

const PRODUCT_BY_ID = new Map(PRODUCTS.map((product) => [product.id, product]));

const TRUST_ITEMS = [
  { icon: Lock, label: "Secure checkout" },
  { icon: RotateCcw, label: "30-day returns" },
  { icon: BadgeCheck, label: "Authenticity" },
] as const;

export default function CartPage() {
  const { lines, count, subtotal, setQuantity, removeLine, clear, restoreLines, freeShippingThreshold: threshold } = useCart();
  const { has, toggle } = useWishlist();
  const freeShipping = subtotal >= threshold;
  const shipping = freeShipping || subtotal === 0 ? 0 : 9.9;
  const total = subtotal + shipping;
  const progress = Math.min(100, Math.round((subtotal / threshold) * 100));
  const remaining = Math.max(0, threshold - subtotal);

  const [promoOpen, setPromoOpen] = React.useState(false);
  const [promoCode, setPromoCode] = React.useState("");

  const savings = React.useMemo(
    () =>
      lines.reduce((sum, line) => {
        const compareAt = PRODUCT_BY_ID.get(line.productId)?.compareAtPrice;
        return compareAt && compareAt > line.price
          ? sum + (compareAt - line.price) * line.quantity
          : sum;
      }, 0),
    [lines]
  );

  const recommendations = React.useMemo(() => {
    const inBag = new Set(lines.map((line) => line.productId));
    return PRODUCTS.filter((product) => !inBag.has(product.id))
      .sort((a, b) => {
        const bestSellers =
          Number(b.tags.includes("bestseller")) - Number(a.tags.includes("bestseller"));
        return bestSellers !== 0 ? bestSellers : b.rating - a.rating;
      })
      .slice(0, 4);
  }, [lines]);

  function removeWithUndo(line: CartLine) {
    removeLine(line.key);
    toast("Removed from bag", {
      description: line.name,
      action: { label: "Undo", onClick: () => restoreLines([line]) },
    });
  }

  function moveToWishlist(line: CartLine) {
    const alreadySaved = has(line.productId);
    if (!alreadySaved) toggle(line.productId);
    removeLine(line.key);
    toast.success("Saved for later", {
      description: alreadySaved
        ? `${line.name} is already in your wishlist`
        : `${line.name} moved to your wishlist`,
      action: {
        label: "Undo",
        onClick: () => {
          restoreLines([line]);
          if (!alreadySaved) toggle(line.productId);
        },
      },
    });
  }

  function applyPromo() {
    if (!promoCode.trim()) {
      toast.error("Enter a promo code first");
      return;
    }
    toast.info("Promo codes aren't active in this demo", {
      description: "Checkout is simulated — no payment is taken.",
    });
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted sm:size-20">
          <ShoppingBag className="size-7 text-muted-foreground sm:size-8" aria-hidden />
        </span>
        <h1 className="font-heading mt-5 max-w-xs text-2xl font-semibold text-balance sm:mt-6 sm:text-3xl">
          Your bag is empty
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Shoes are waiting. Browse the collection and add a pair to your rotation.
        </p>
        <Button size="lg" className="mt-6 w-full max-w-xs rounded-full" render={<Link href="/products" />}>
          Shop all shoes <ArrowRight aria-hidden />
        </Button>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="size-3.5" aria-hidden />
          Free express shipping over {formatPrice(threshold)}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-40 sm:px-6 sm:pt-6 lg:px-8 lg:pb-24">
      <header className="mb-4 sm:mb-8">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          Your selection
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
          Shopping bag
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {count} {count === 1 ? "item" : "items"} · {lines.length} {lines.length === 1 ? "style" : "styles"} · saved on this device
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Lines */}
        <div>
          {/* Free shipping progress */}
          <div
            className={cn(
              "mb-4 rounded-2xl border bg-card p-3.5 transition-colors sm:p-4",
              freeShipping && "border-emerald-600/20 bg-emerald-500/5"
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  freeShipping
                    ? "bg-emerald-500/10 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {freeShipping ? (
                  <CheckCircle2 className="size-4" aria-hidden />
                ) : (
                  <Truck className="size-4" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                {freeShipping ? (
                  <p className="text-sm font-medium text-emerald-700">
                    Free express shipping unlocked
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add{" "}
                    <strong className="font-semibold text-foreground">
                      {formatPrice(remaining)}
                    </strong>{" "}
                    for free express shipping
                  </p>
                )}
                <div
                  className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progress to free shipping"
                >
                  <span
                    className="block h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {freeShipping
                    ? "Express delivery is on us."
                    : `${progress}% of the way to free express delivery.`}
                </p>
              </div>
            </div>
          </div>

          <Card className="overflow-visible">
            <ul className="divide-y">
              {lines.map((line) => {
                const product = PRODUCT_BY_ID.get(line.productId);
                const stock =
                  product?.sizes.find((size) => size.size === line.size)?.stock ?? Infinity;
                const atMax = line.quantity >= stock;
                const lowStock = stock !== Infinity && stock <= 3;
                const saved = has(line.productId);

                return (
                  <li
                    key={line.key}
                    className="relative p-3.5 transition-colors hover:bg-muted/20 sm:p-5"
                  >
                    <div className="flex gap-3 sm:gap-4">
                      <Link
                        href={`/products/${line.slug}`}
                        className="zoom-container relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-24 sm:rounded-2xl"
                      >
                        <Image
                          src={line.image}
                          alt={line.name}
                          fill
                          sizes="(max-width: 640px) 80px, 96px"
                          className="object-cover"
                        />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                              {line.brand}
                            </p>
                            <Link
                              href={`/products/${line.slug}`}
                              className="line-clamp-2 text-sm leading-snug font-medium hover:underline sm:text-[15px] after:absolute after:inset-0 after:content-['']"
                            >
                              {line.name}
                            </Link>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Size {line.size}
                              <span className="px-1.5 text-border" aria-hidden>
                                ·
                              </span>
                              {formatPrice(line.price)} each
                            </p>
                            {lowStock && (
                              <p className="mt-1 text-[11px] font-medium text-amber-600">
                                {atMax ? `Max ${stock} available` : `Only ${stock} left`}
                              </p>
                            )}
                          </div>
                          <p className="shrink-0 text-sm font-semibold whitespace-nowrap sm:text-base">
                            {formatPrice(line.price * line.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 sm:pl-28">
                      <div className="flex items-center rounded-full border bg-background">
                        <button
                          aria-label={
                            line.quantity === 1
                              ? `Remove ${line.name} from bag`
                              : `Decrease quantity of ${line.name}`
                          }
                          className="relative z-10 flex size-9 items-center justify-center rounded-full transition-colors hover:bg-muted sm:size-8"
                          onClick={() => {
                            if (line.quantity <= 1) {
                              removeWithUndo(line);
                            } else {
                              setQuantity(line.key, line.quantity - 1);
                            }
                          }}
                        >
                          {line.quantity === 1 ? (
                            <Trash2 className="size-3.5 text-muted-foreground" aria-hidden />
                          ) : (
                            <Minus className="size-3.5" aria-hidden />
                          )}
                        </button>
                        <span className="w-7 text-center text-sm font-medium sm:w-8">
                          {line.quantity}
                        </span>
                        <button
                          aria-label={
                            atMax
                              ? `Maximum quantity reached for ${line.name}`
                              : `Increase quantity of ${line.name}`
                          }
                          disabled={atMax}
                          className="relative z-10 flex size-9 items-center justify-center rounded-full transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent sm:size-8"
                          onClick={() =>
                            setQuantity(line.key, Math.min(line.quantity + 1, stock))
                          }
                        >
                          <Plus className="size-3.5" aria-hidden />
                        </button>
                      </div>

                      <div className="ml-auto flex items-center gap-0.5 sm:ml-0">
                        <button
                          aria-label={
                            saved
                              ? `${line.name} is already in your wishlist — move from bag`
                              : `Save ${line.name} for later`
                          }
                          className="relative z-10 flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={() => moveToWishlist(line)}
                        >
                          <Heart
                            className={cn("size-4", saved && "fill-red-500 text-red-500")}
                            aria-hidden
                          />
                          Save
                        </button>
                        <button
                          aria-label={`Remove ${line.name} from bag`}
                          className="relative z-10 flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                          onClick={() => removeWithUndo(line)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" className="rounded-full" render={<Link href="/products" />}>
              <ArrowLeft aria-hidden /> Continue shopping
            </Button>
            <Button
              variant="ghost"
              className="rounded-full text-muted-foreground"
              onClick={() => {
                const snapshot = lines;
                clear();
                toast("Bag cleared", {
                  description: `${snapshot.length} ${snapshot.length === 1 ? "item" : "items"} removed`,
                  action: { label: "Undo", onClick: () => restoreLines(snapshot) },
                });
              }}
            >
              Clear bag
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-heading text-lg">Order summary</CardTitle>
                <Badge variant="secondary" className="rounded-full">
                  {count} {count === 1 ? "item" : "items"}
                </Badge>
              </div>
              <CardDescription>Shipping and taxes calculated at checkout</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className={freeShipping ? "font-medium text-emerald-600" : ""}>
                  {freeShipping ? "FREE" : formatPrice(shipping)}
                </span>
              </div>
              {savings > 0 && (
                <div className="flex items-center justify-between text-sm text-emerald-600">
                  <span className="flex items-center gap-1.5">
                    <Tag className="size-3.5" aria-hidden /> You save
                  </span>
                  <span className="font-medium">−{formatPrice(savings)}</span>
                </div>
              )}
              {!freeShipping && (
                <p className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                  <Truck className="size-4 shrink-0" aria-hidden />
                  Add {formatPrice(remaining)} more for free shipping
                </p>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-heading text-xl font-semibold">{formatPrice(total)}</span>
              </div>
              {/* CTA lives in the sticky bar on mobile — avoid a second thumb-target */}
              <Button
                size="lg"
                className="mt-2 hidden w-full rounded-full lg:flex"
                render={<Link href="/checkout" />}
              >
                Go to checkout <ArrowRight aria-hidden />
              </Button>

              <div className="overflow-hidden rounded-xl border">
                <button
                  type="button"
                  aria-expanded={promoOpen}
                  onClick={() => setPromoOpen((open) => !open)}
                  className="flex h-10 w-full items-center justify-between gap-2 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Tag className="size-3.5" aria-hidden /> Have a promo code?
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-200",
                      promoOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
                {promoOpen && (
                  <div className="flex items-center gap-2 border-t p-2">
                    <Input
                      aria-label="Promo code"
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value)}
                      className="h-10 rounded-xl"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          applyPromo();
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      className="h-10 shrink-0 rounded-xl"
                      onClick={applyPromo}
                    >
                      Apply
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
                <Truck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                <div className="min-w-0">
                  <p className="text-xs font-medium">Express delivery</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Free over {formatPrice(threshold)} · 2–4 business days
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-t pt-3">
                {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-center">
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                    <span className="text-[10px] leading-tight text-muted-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {recommendations.length > 0 && (
        <section className="mt-12 border-t pt-8 sm:mt-16">
          <div className="mb-4 flex items-end justify-between gap-3 sm:mb-6">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                Keep browsing
              </p>
              <h2 className="font-heading mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                You might also like
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-muted-foreground"
              render={<Link href="/products" />}
            >
              View all <ArrowRight aria-hidden />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
            {recommendations.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky mobile checkout bar — the mobile tab bar is hidden on /cart */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl lg:hidden">
        <div className="h-1 bg-muted" aria-hidden>
          <span
            className="block h-full bg-emerald-500 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Total · {count} {count === 1 ? "item" : "items"}
            </p>
            <p className="font-heading truncate text-lg leading-tight font-semibold">
              {formatPrice(total)}
            </p>
            <p
              className={cn(
                "truncate text-[10px] font-medium",
                freeShipping ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              {freeShipping
                ? "Free express shipping unlocked"
                : `${formatPrice(shipping)} shipping · ${formatPrice(remaining)} away from free`}
            </p>
          </div>
          <Button
            size="lg"
            className="h-11 shrink-0 justify-center rounded-full px-5"
            render={<Link href="/checkout" />}
          >
            Checkout <ArrowRight aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
