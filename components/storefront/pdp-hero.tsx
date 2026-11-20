"use client";

import * as React from "react";
import type { Product } from "@/lib/types";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { BuyPanel } from "@/components/storefront/buy-panel";
import { PdpBuyBar } from "@/components/storefront/pdp-buy-bar";

/**
 * Client wrapper for the PDP hero: owns the selected size/quantity so the
 * buy panel and the fixed mobile buy bar stay in sync.
 */
export function PdpHero({ product }: { product: Product }) {
  const inStockSizes = product.sizes.filter((s) => s.stock > 0);
  const [size, setSize] = React.useState<string | null>(inStockSizes[0]?.size ?? null);
  const [qty, setQty] = React.useState(1);

  return (
    <>
      <div className="grid gap-10 px-4 pt-5 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 xl:gap-16">
        <ProductGallery images={product.images} alt={product.name} />
        <div className="lg:pt-4 xl:pt-10">
          <BuyPanel
            product={product}
            size={size}
            onSize={setSize}
            qty={qty}
            onQty={setQty}
          />
        </div>
      </div>

      <PdpBuyBar product={product} size={size} />
    </>
  );
}
