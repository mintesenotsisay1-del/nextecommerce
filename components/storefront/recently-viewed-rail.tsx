"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { useRecentlyViewed } from "@/components/providers/recently-viewed-provider";
import { getProductBySlug } from "@/lib/data/products";
import { formatPrice } from "@/lib/format";

/** "Recently viewed" rail — reads from the RecentlyViewedProvider (localStorage). */
export function RecentlyViewedRail({ excludeSlug }: { excludeSlug?: string }) {
  const { slugs, track } = useRecentlyViewed();

  // The PDP mounts this on the client after hydration — record the current page.
  React.useEffect(() => {
    if (excludeSlug) track(excludeSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excludeSlug]);

  const items = slugs
    .filter((s) => s !== excludeSlug)
    .map((s) => getProductBySlug(s))
    .filter(Boolean)
    .slice(0, 4) as NonNullable<ReturnType<typeof getProductBySlug>>[];

  if (items.length === 0) return null;

  return (
    <section className="mx-auto mt-16 w-full max-w-7xl border-t pt-10 px-4 sm:px-6 lg:px-8">
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        <Clock className="size-3.5" aria-hidden /> Recently viewed
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((p) => (
          <Link key={p.slug} href={`/products/${p.slug}`} className="group rounded-2xl">
            <div className="zoom-container relative aspect-square overflow-hidden rounded-xl bg-muted">
              <Image src={p.images[0]} alt={p.name} fill sizes="20vw" className="object-cover" />
            </div>
            <p className="mt-2 truncate text-xs font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{formatPrice(p.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
