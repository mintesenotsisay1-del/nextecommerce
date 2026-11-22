"use client";

import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { ProductCard } from "@/components/storefront/product-card";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Home-page product grid that follows the admin's live layout settings.
 * Reads the settings context so demo-mode changes from localStorage and
 * Supabase-backed changes both update without a reload.
 */
export function HomeProductGrid({
  products,
  priorityCount = 0,
}: {
  products: Product[];
  priorityCount?: number;
}) {
  const { settings } = useSiteSettings();
  const columns = settings.homeLayout.gridColumns;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6",
        columns === 2 ? "lg:grid-cols-2" : "lg:grid-cols-4"
      )}
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}
