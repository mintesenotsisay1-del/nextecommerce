"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { useRecentlyViewed } from "@/components/providers/recently-viewed-provider";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export type RecentlyViewedProduct = Pick<Product, "slug" | "name" | "price" | "images">;

/**
 * "Recently viewed" rail — reads from the RecentlyViewedProvider (localStorage)
 * and resolves each slug against the live catalogue passed by the server.
 * That keeps Supabase-only products visible too, not just local demo pairs.
 */
export function RecentlyViewedRail({
  products,
  excludeSlug,
}: {
  products: RecentlyViewedProduct[];
  excludeSlug?: string;
}) {
  const { slugs, track } = useRecentlyViewed();

  // The PDP mounts this on the client after hydration — record the current page.
  React.useEffect(() => {
    if (excludeSlug) track(excludeSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeSlug]);

  const bySlug = React.useMemo(
    () => new Map(products.map((product) => [product.slug, product])),
    [products]
  );

  const items = slugs
    .filter((slug) => slug !== excludeSlug)
    .map((slug) => bySlug.get(slug))
    .filter((product): product is RecentlyViewedProduct => Boolean(product))
    .slice(0, 4);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto mt-16 w-full max-w-7xl border-t px-4 pt-10 sm:px-6 lg:px-8">
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        <Clock className="size-3.5" aria-hidden /> Recently viewed
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((product) => (
          <Link
            key={product.slug}
            href={`/products/${product.slug}`}
            className="group rounded-2xl"
          >
            <div className="zoom-container relative aspect-square overflow-hidden rounded-xl bg-muted">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, 20vw"
                className="object-cover"
              />
            </div>
            <p className="mt-2 truncate text-xs font-medium">{product.name}</p>
            <p className="text-xs text-muted-foreground">{formatPrice(product.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
