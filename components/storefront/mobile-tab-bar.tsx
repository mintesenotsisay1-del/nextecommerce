"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Search, ShoppingBag, Store } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { SearchDialog } from "@/components/storefront/search-dialog";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/products", label: "Shop", icon: Store },
];

/** iOS/Android-style bottom tab bar — keeps mobile navigation one thumb away. */
export function MobileTabBar({ products }: { products?: Product[] } = {}) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const { count, openCart } = useCart();
  const { ids } = useWishlist();

  // On product detail the fixed purchase bar owns the thumb zone, and the
  // cart/checkout flows get focused, decluttered chrome — hide the tab bar
  // there (wishlist/cart stay reachable via the header icons).
  if (
    pathname.startsWith("/products/") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout")
  ) {
    return null;
  }

  return (
    <>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith("/products");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            );
          })}

          <button
            onClick={() => setSearchOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
          >
            <Search className="size-5" aria-hidden />
            Search
          </button>

          <Link
            href="/wishlist"
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
              pathname === "/wishlist" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <span className="relative">
              <Heart className="size-5" aria-hidden />
              {ids.length > 0 && (
                <span className="absolute -top-1 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-foreground text-[8px] font-bold text-background">
                  {ids.length}
                </span>
              )}
            </span>
            Wishlist
          </Link>

          <button
            onClick={openCart}
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
          >
            <span className="relative">
              <ShoppingBag className="size-5" aria-hidden />
              {count > 0 && (
                <span className="absolute -top-1 right-0 flex size-3.5 items-center justify-center rounded-full bg-foreground text-[8px] font-bold text-background">
                  {count}
                </span>
              )}
            </span>
            Bag
          </button>
        </div>
      </nav>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} products={products} />
    </>
  );
}
