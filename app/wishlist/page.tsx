import type { Metadata } from "next";
import { WishlistClient } from "./wishlist-client";
import { getStorefrontCatalogue } from "@/lib/data/storefront-products";
import { loadSiteSettings } from "@/lib/data/site-settings";

export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { companyName } = await loadSiteSettings();

  return {
    title: "Wishlist",
    description: `The pairs you have saved at ${companyName} — synced to your account when you are signed in, with a local fallback for guest browsing.`,
  };
}

export default async function WishlistPage() {
  const products = await getStorefrontCatalogue();
  return <WishlistClient products={products} />;
}
