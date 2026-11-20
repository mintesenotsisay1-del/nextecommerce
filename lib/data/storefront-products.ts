import { cache } from "react";
import { PRODUCTS } from "@/lib/data/products";
import { getSupabasePublicClient } from "@/lib/supabase/public";
import type { AdminProduct, Category, Product, SizeVariant } from "@/lib/types";

/**
 * Server-side product source for the storefront.
 *
 * Published Supabase rows are the source of truth whenever the table has data.
 * The local demo catalogue is only used when Supabase is not configured, is
 * unreachable, or has not been seeded yet. Product detail pages also fall back
 * to a single local product so old links (and local-only demo pairs) keep
 * working.
 */

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  gender: string;
  color: string | null;
  color_family: string | null;
  price: number | string;
  compare_at_price: number | string | null;
  images: string[] | null;
  sizes: unknown;
  rating: number | string;
  review_count: number | string;
  tags: string[] | null;
  short_description: string | null;
  description: string | null;
  details: string[] | null;
  care: string | null;
};

export type StorefrontProduct = AdminProduct;

const CATEGORIES = new Set<Category>([
  "sneakers",
  "running",
  "basketball",
  "boots",
  "dress",
  "heels",
]);
const GENDERS = new Set<Product["gender"]>(["men", "women", "unisex"]);
const TAGS = new Set<Product["tags"][number]>(["new", "bestseller", "limited", "sale"]);

const LOCAL_ID_BY_SLUG = new Map(PRODUCTS.map((product) => [product.slug, product.id]));

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

function asSizes(value: unknown): SizeVariant[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const size = "size" in item ? item.size : null;
    const stock = "stock" in item ? item.stock : null;
    if (typeof size !== "string" || typeof stock !== "number" || !Number.isFinite(stock)) {
      return [];
    }
    return [{ size, stock: Math.max(0, Math.trunc(stock)) }];
  });
}

function mapRow(row: ProductRow): StorefrontProduct {
  const local = PRODUCTS.find((product) => product.slug === row.slug);
  const images = asStringArray(row.images);
  const sizes = asSizes(row.sizes);
  const tags = asStringArray(row.tags).filter(
    (tag): tag is Product["tags"][number] => TAGS.has(tag as Product["tags"][number])
  );
  const details = asStringArray(row.details);
  const compareAtPrice =
    row.compare_at_price === null ? undefined : Number(row.compare_at_price);

  return {
    sourceId: row.id,
    product: {
      // Keep legacy demo ids for seeded pairs so carts, wishlists and recently
      // viewed items continue to match cards rendered from local data elsewhere.
      id: LOCAL_ID_BY_SLUG.get(row.slug) ?? row.id,
      slug: row.slug,
      name: row.name,
      brand: row.brand,
      category: CATEGORIES.has(row.category as Category)
        ? (row.category as Category)
        : (local?.category ?? "sneakers"),
      gender: GENDERS.has(row.gender as Product["gender"])
        ? (row.gender as Product["gender"])
        : (local?.gender ?? "unisex"),
      color: row.color ?? local?.color ?? "Multi",
      colorFamily: row.color_family ?? local?.colorFamily ?? "multi",
      price: Number(row.price),
      compareAtPrice:
        compareAtPrice !== undefined && Number.isFinite(compareAtPrice)
          ? compareAtPrice
          : undefined,
      images: images.length ? images : (local?.images ?? ["/img/products/am1-orange-white.jpg"]),
      sizes: sizes.length ? sizes : (local?.sizes ?? []),
      rating: Number(row.rating),
      reviewCount: Number(row.review_count),
      tags,
      shortDescription: row.short_description ?? local?.shortDescription ?? "",
      description: row.description ?? local?.description ?? "",
      details: details.length ? details : (local?.details ?? []),
      care: row.care ?? local?.care ?? "",
    },
  };
}

/** Request-scoped read of published Supabase products. */
const getSupabaseProducts = cache(async (): Promise<StorefrontProduct[]> => {
  const supabase = getSupabasePublicClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[storefront] Could not load Supabase products:", error.message);
      return [];
    }

    return ((data ?? []) as ProductRow[]).map(mapRow);
  } catch (error) {
    console.error("[storefront] Supabase product request failed:", error);
    return [];
  }
});

/**
 * Products for the catalogue/search UI. Supabase takes over as soon as it has
 * at least one published row; otherwise the local demo catalogue is shown.
 */
export const getCatalogProducts = cache(async (): Promise<Product[]> => {
  const remote = await getSupabaseProducts();
  return remote.length ? remote.map((entry) => entry.product) : PRODUCTS;
});

/**
 * Product lookup with the original Supabase id kept alongside it for reviews.
 * Supabase is checked first, then local products for legacy/local-only slugs.
 */
export const getStorefrontProductBySlug = cache(
  async (slug: string): Promise<StorefrontProduct | undefined> => {
    const remote = await getSupabaseProducts();
    const match = remote.find((entry) => entry.product.slug === slug);
    if (match) return match;

    const local = PRODUCTS.find((product) => product.slug === slug);
    return local ? { product: local, sourceId: null } : undefined;
  }
);

/**
 * Every product the storefront can resolve, including local-only demo pairs.
 * Supabase entries carry their row UUID so admin/review writes can target the
 * right record even when the displayed product id is a legacy demo id.
 */
export const getStorefrontProductEntries = cache(
  async (): Promise<StorefrontProduct[]> => {
    const remote = await getSupabaseProducts();
    if (!remote.length) {
      return PRODUCTS.map((product) => ({ product, sourceId: null }));
    }

    const remoteSlugs = new Set(remote.map((entry) => entry.product.slug));
    return [
      ...remote,
      ...PRODUCTS.filter((product) => !remoteSlugs.has(product.slug)).map(
        (product) => ({ product, sourceId: null })
      ),
    ];
  }
);

/**
 * Every product the storefront can resolve, including local-only demo pairs.
 * Used by the wishlist and related-products rail so saved legacy items never
 * disappear when Supabase becomes the catalogue source.
 */
export const getStorefrontCatalogue = cache(async (): Promise<Product[]> => {
  const entries = await getStorefrontProductEntries();
  return entries.map((entry) => entry.product);
});
