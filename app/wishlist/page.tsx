import type { Metadata } from "next";
import { WishlistClient } from "./wishlist-client";
import { getStorefrontCatalogue } from "@/lib/data/storefront-products";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Wishlist",
  description:
    "The pairs you have saved at Sole & Stone — synced to your account when you are signed in, with a local fallback for guest browsing.",
};

export default async function WishlistPage() {
  const products = await getStorefrontCatalogue();
  return <WishlistClient products={products} />;
}
