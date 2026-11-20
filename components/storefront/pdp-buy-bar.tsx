"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Fixed thumb-reach purchase bar (mobile only). Hidden on lg+, where the
 * inline Add-to-bag button in the buy panel takes over.
 */
export function PdpBuyBar({
  product,
  size,
}: {
  product: Product;
  size: string | null;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const { has, toggle } = useWishlist();

  const stock = product.sizes.find((s) => s.size === size)?.stock ?? 0;
  const soldOut = !size || stock === 0;
  const liked = has(product.id);

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={liked}
          onClick={() => {
            const added = toggle(product.id);
            if (added) toast.success("Saved to wishlist");
          }}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-background transition-colors hover:bg-muted"
        >
          <Heart
            className={cn("size-5", liked && "fill-red-500 text-red-500")}
            aria-hidden
          />
        </button>
        <button
          type="button"
          disabled={soldOut}
          onClick={() => {
            if (!size) return;
            addItem(product, size, 1);
            toast.success("Added to bag", {
              description: `${product.name} · ${size}`,
              action: { label: "View bag", onClick: () => router.push("/cart") },
            });
          }}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-foreground text-sm font-medium text-background transition-transform active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        >
          <ShoppingBag className="size-4" aria-hidden />
          {!size || stock === 0 ? "Sold out" : `Add to bag · ${formatPrice(product.price)}`}
        </button>
      </div>
    </div>
  );
}
