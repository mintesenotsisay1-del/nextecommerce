"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Check,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { Stars } from "@/components/storefront/product-card";
import { discountPercent, formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils";

const SWATCHES: Record<string, string> = {
  black: "#1c1917",
  white: "#fafafa",
  red: "#dc2626",
  blue: "#1e40af",
  brown: "#92683a",
  burgundy: "#8f2d3c",
  grey: "#9ca3af",
  green: "#166534",
  beige: "#d6c3a5",
  navy: "#1e3a5f",
  tan: "#d0a878",
};

type BuyPanelProps = {
  product: Product;
  size: string | null;
  onSize: (size: string | null) => void;
  qty: number;
  onQty: (qty: number) => void;
};

export function BuyPanel({
  product,
  size,
  onSize,
  qty,
  onQty,
}: BuyPanelProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();
  const inStockSizes = product.sizes.filter((s) => s.stock > 0);
  const [guideOpen, setGuideOpen] = React.useState(false);
  const selected = product.sizes.find((s) => s.size === size);
  const stock = selected?.stock ?? 0;
  const maxQty = Math.max(1, stock);
  const discounted = discountPercent(product.price, product.compareAtPrice);
  const liked = has(product.id);

  // ETA reads the wall clock after hydration (via useNow) so the render stays
  // pure — SSR shows a generic estimate that upgrades to a concrete date.
  const now = useNow();
  const etaStr =
    now === null
      ? "in 3–5 business days"
      : new Date(now + 3 * 86400000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

  async function share() {
    const data = { title: product.name, text: product.shortDescription, url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  }

  function handleAdd() {
    if (!size || stock === 0) return;
    addItem(product, size, Math.min(qty, maxQty));
    toast.success("Added to bag", {
      description: `${product.name} · ${size}`,
      action: { label: "View bag", onClick: () => router.push("/cart") },
    });
  }

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        {product.brand} · {product.category}
      </p>
      <h1 className="font-heading mt-2 text-3xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-4xl">
        {product.name}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{product.color}</p>

      {/* Rating → reviews anchor */}
      <a
        href="#reviews"
        className="mt-3 inline-flex items-center gap-2 rounded-full align-middle"
      >
        <Stars rating={product.rating} />
        <span className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
          {(product.rating ?? 0).toFixed(1)} ({product.reviewCount} reviews)
        </span>
      </a>

      {/* Price */}
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <span
          className={cn(
            "text-3xl font-semibold tracking-tight",
            discounted && "text-red-600"
          )}
        >
          {formatPrice(product.price)}
        </span>
        {discounted && (
          <>
            <span className="text-lg text-muted-foreground line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
            <Badge className="rounded-full bg-red-600 text-white">
              Save {discounted}%
            </Badge>
          </>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Incl. taxes · Free returns for 30 days
      </p>

      <Separator className="my-6" />

      {/* Colour */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Colour
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-5 rounded-full border border-border shadow-inner"
            style={{ backgroundColor: SWATCHES[product.colorFamily] ?? "#e7e5e4" }}
          />
          {product.color}
        </span>
      </div>

      {/* Size selector */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-semibold">
          Select size{" "}
          <span className="font-normal text-muted-foreground">
            · {inStockSizes.length} available
          </span>
        </p>
        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Size guide
        </button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
        {product.sizes.map((s) => {
          const out = s.stock === 0;
          return (
            <button
              key={s.size}
              disabled={out}
              onClick={() => {
                onSize(s.size);
                onQty(1);
              }}
              aria-pressed={size === s.size}
              className={cn(
                "relative rounded-xl border py-2.5 text-sm font-medium transition-all",
                out
                  ? "cursor-not-allowed text-muted-foreground/35"
                  : "hover:border-foreground/30 hover:bg-muted",
                size === s.size && !out && "border-foreground bg-foreground text-background"
              )}
            >
              {s.size.replace("US ", "").replace("EU ", "")}
              {out && (
                <span className="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 rotate-[-8deg] bg-muted-foreground/40" />
              )}
            </button>
          );
        })}
      </div>

      {/* Stock signal */}
      {size && (
        <p className="mt-3 flex items-center gap-2 text-xs">
          {stock > 5 ? (
            <>
              <Check className="size-3.5 text-emerald-600" aria-hidden />
              <span className="text-emerald-700">In stock — ships today</span>
            </>
          ) : stock > 0 ? (
            <>
              <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
              <span className="font-medium text-amber-600">
                Only {stock} left in {size}
              </span>
            </>
          ) : (
            <>
              <span className="size-1.5 rounded-full bg-red-500" aria-hidden />
              <span className="text-red-600">Out of stock — pick another size</span>
            </>
          )}
        </p>
      )}

      {/* Quantity + add (mobile bar adds to bag below; hide the step+cta on phones) */}
      <div className="mt-5 hidden flex-col gap-2 sm:flex sm:flex-row">
        <div className="flex h-12 items-center justify-between rounded-full border px-2 lg:w-36">
          <button
            aria-label="Decrease quantity"
            className="flex size-8 items-center justify-center rounded-full hover:bg-muted"
            onClick={() => onQty(Math.max(1, qty - 1))}
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="min-w-8 text-center text-sm font-semibold">{qty}</span>
          <button
            aria-label="Increase quantity"
            className="flex size-8 items-center justify-center rounded-full hover:bg-muted"
            onClick={() => onQty(Math.min(maxQty, qty + 1))}
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        <Button
          size="lg"
          disabled={!size || stock === 0}
          onClick={handleAdd}
          className="h-12 flex-1 rounded-full"
        >
          <ShoppingBag aria-hidden />
          {stock === 0
            ? "Sold out"
            : `Add to bag · ${formatPrice(product.price * Math.min(qty, maxQty))}`}
        </Button>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={liked}
            className="size-12 rounded-full"
            onClick={() => {
              const added = toggle(product.id);
              if (added) toast.success("Saved to wishlist");
            }}
          >
            <Heart className={cn("size-5", liked && "fill-red-500 text-red-500")} aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Share product"
            className="size-12 rounded-full"
            onClick={share}
          >
            <Share2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Reassurance cards */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border bg-card p-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Truck className="size-4" aria-hidden />
          </span>
          <div className="text-xs">
            <p className="font-semibold">Est. delivery {etaStr}</p>
            <p className="mt-0.5 text-muted-foreground">Order by 2 pm for same-day dispatch</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border bg-card p-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <BadgeCheck className="size-4" aria-hidden />
          </span>
          <div className="text-xs">
            <p className="font-semibold">100% authentic</p>
            <p className="mt-0.5 text-muted-foreground">Manual authenticity check on every pair</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border bg-card p-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <RotateCcw className="size-4" aria-hidden />
          </span>
          <div className="text-xs">
            <p className="font-semibold">30-day free returns</p>
            <p className="mt-0.5 text-muted-foreground">Worn or unworn, prepaid label included</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border bg-card p-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          <div className="text-xs">
            <p className="font-semibold">Secure checkout</p>
            <p className="mt-0.5 text-muted-foreground">Encrypted payments & buyer protection</p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        {product.description}
      </p>

      <Separator className="my-6" />

      <p className="text-xs text-muted-foreground">
        Looking for tracking or help?{" "}
        <Link href="/account" className="underline underline-offset-2 hover:text-foreground">
          Visit your account
        </Link>
        .
      </p>

      {/* Size guide dialog */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading">Size guide</DialogTitle>
            <DialogDescription>
              Fits this {product.brand} {product.category} — pick your usual size; our
              catalogue runs true to size.
            </DialogDescription>
          </DialogHeader>
          <ul className="divide-y text-sm">
            {product.sizes.map((s) => (
              <li key={s.size} className="flex items-center justify-between py-2.5">
                <span className="font-medium">{s.size}</span>
                {s.stock > 0 ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-700">
                    <Check className="size-3.5" aria-hidden />
                    {s.stock} in stock
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <X className="size-3.5" aria-hidden />
                    Sold out
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Between sizes? Take the larger one for running and basketball; true to size
            for lifestyle and dress.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
