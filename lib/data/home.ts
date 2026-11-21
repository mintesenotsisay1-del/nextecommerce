import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/data/catalog-meta";
import { discountPercent } from "@/lib/format";
import type { Category, Product } from "@/lib/types";

/**
 * Pure home-page selections built from whatever catalogue the storefront is
 * currently serving (Supabase when seeded, local demo data otherwise).
 *
 * Nothing here mutates a product or its price — sections only filter, rank and
 * group the live rows so the home page always mirrors the real catalogue.
 */

export type CategoryTile = {
  value: Category;
  name: string;
  image: string;
  count: number;
};

export type BrandTile = {
  name: string;
  image: string;
  count: number;
};

export type CatalogueStats = {
  styles: number;
  brands: number;
  categories: number;
  rating: number;
};

const FALLBACK_IMAGE = "/img/products/am1-orange-white.jpg";

const byRating = (a: Product, b: Product) =>
  b.rating - a.rating || b.reviewCount - a.reviewCount;

const saleDiscount = (product: Product) =>
  discountPercent(product.price, product.compareAtPrice) ?? 0;

function unique(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

/** Fill a short selection with top-rated fallbacks, never duplicating a card. */
function fill(primary: Product[], pool: Product[], count: number): Product[] {
  return unique([...primary, ...pool]).slice(0, count);
}

export function getCategoryTiles(products: Product[]): CategoryTile[] {
  return CATEGORY_ORDER.flatMap((category) => {
    const matches = products.filter((product) => product.category === category);
    if (!matches.length) return [];

    const cover = [...matches].sort(byRating)[0];
    return [
      {
        value: category,
        name: CATEGORY_LABELS[category],
        image: cover.images[0] ?? FALLBACK_IMAGE,
        count: matches.length,
      },
    ];
  });
}

export function getBrandTiles(products: Product[], count = 8): BrandTile[] {
  const groups = new Map<string, Product[]>();

  for (const product of products) {
    const group = groups.get(product.brand) ?? [];
    group.push(product);
    groups.set(product.brand, group);
  }

  return [...groups.entries()]
    .map(([name, group]) => {
      const cover = [...group].sort(byRating)[0];
      return {
        name,
        image: cover.images[0] ?? FALLBACK_IMAGE,
        count: group.length,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, count);
}

/**
 * Editor's picks favour commercial signals (bestseller, limited, new, sale)
 * and then social proof, so the row changes naturally as the catalogue does.
 */
export function getFeaturedSelection(products: Product[], count = 4): Product[] {
  const score = (product: Product) =>
    (product.tags.includes("bestseller") ? 30 : 0) +
    (product.tags.includes("limited") ? 22 : 0) +
    (product.tags.includes("new") ? 14 : 0) +
    (product.tags.includes("sale") ? 8 : 0) +
    product.rating * 6 +
    Math.log10(product.reviewCount + 1) * 3;

  return [...products].sort((a, b) => score(b) - score(a)).slice(0, count);
}

export function getNewArrivalSelection(products: Product[], count = 4): Product[] {
  const fresh = products.filter((product) => product.tags.includes("new"));
  return fill(fresh, [...products].sort(byRating), count);
}

export function getBestSellerSelection(products: Product[], count = 4): Product[] {
  const best = products
    .filter((product) => product.tags.includes("bestseller"))
    .sort((a, b) => b.reviewCount - a.reviewCount || b.rating - a.rating);

  return fill(best, [...products].sort(byRating), count);
}

export function getSaleSelection(products: Product[], count = 4): Product[] {
  return products
    .filter((product) => saleDiscount(product) > 0)
    .sort((a, b) => saleDiscount(b) - saleDiscount(a) || byRating(a, b))
    .slice(0, count);
}

export function getValueSelection(products: Product[], count = 4): Product[] {
  return [...products]
    .sort((a, b) => a.price - b.price || byRating(a, b))
    .slice(0, count);
}

export function getMaxDiscount(products: Product[]): number {
  return products.reduce((max, product) => Math.max(max, saleDiscount(product)), 0);
}

export function getCatalogueStats(products: Product[]): CatalogueStats {
  const reviews = products.reduce((sum, product) => sum + product.reviewCount, 0);
  const weightedRating = products.reduce(
    (sum, product) => sum + product.rating * product.reviewCount,
    0
  );
  const rating = reviews
    ? weightedRating / reviews
    : products.length
      ? products.reduce((sum, product) => sum + product.rating, 0) / products.length
      : 0;

  return {
    styles: products.length,
    brands: new Set(products.map((product) => product.brand)).size,
    categories: new Set(products.map((product) => product.category)).size,
    rating: Math.round(rating * 10) / 10,
  };
}
