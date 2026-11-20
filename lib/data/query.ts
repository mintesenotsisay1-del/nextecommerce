import { PRODUCTS } from "@/lib/data/products";
import type { Product } from "@/lib/types";

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "rating";

export type ProductQuery = {
  q: string;
  cat: string[];
  brand: string[];
  size: string[];
  color: string[];
  min: number;
  max: number;
  sale: boolean;
  sort: SortKey;
};

export const DEFAULT_QUERY: ProductQuery = {
  q: "",
  cat: [],
  brand: [],
  size: [],
  color: [],
  min: 0,
  max: 500,
  sale: false,
  sort: "featured",
};

export function priceBounds(products: Product[] = PRODUCTS): [number, number] {
  if (!products.length) return [0, 0];
  const prices = products.map((product) => product.price);
  return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
}

/** Parses URLSearchParams from the /products?... URL into a typed query. */
export function parseQuery(
  params: URLSearchParams,
  products: Product[] = PRODUCTS
): ProductQuery {
  const [minB, maxB] = priceBounds(products);
  const num = (v: string | null, fb: number) => {
    if (v === null || v === "") return fb;
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };
  const list = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);
  const sortRaw = params.get("sort") as SortKey | null;
  const sort: SortKey = ["featured", "newest", "price-asc", "price-desc", "rating"].includes(sortRaw ?? "")
    ? (sortRaw as SortKey)
    : "featured";
  const min = Math.min(maxB, Math.max(minB, num(params.get("min"), minB)));
  const max = Math.min(maxB, Math.max(min, num(params.get("max"), maxB)));
  return {
    q: params.get("q") ?? "",
    cat: list(params.get("cat")),
    brand: list(params.get("brand")),
    size: list(params.get("size")),
    color: list(params.get("color")),
    min,
    max,
    sale: params.get("sale") === "1",
    sort,
  };
}

export function queryToUrl(
  query: ProductQuery,
  products: Product[] = PRODUCTS
): string {
  const [minB, maxB] = priceBounds(products);
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.cat.length) params.set("cat", query.cat.join(","));
  if (query.brand.length) params.set("brand", query.brand.join(","));
  if (query.size.length) params.set("size", query.size.join(","));
  if (query.color.length) params.set("color", query.color.join(","));
  if (query.min !== minB) params.set("min", String(query.min));
  if (query.max !== maxB) params.set("max", String(query.max));
  if (query.sale) params.set("sale", "1");
  if (query.sort !== "featured") params.set("sort", query.sort);
  const s = params.toString();
  return s ? `/products?${s}` : "/products";
}

export function activeFilterCount(
  query: ProductQuery,
  products: Product[] = PRODUCTS
): number {
  const [minB, maxB] = priceBounds(products);
  return (
    query.cat.length +
    query.brand.length +
    query.size.length +
    query.color.length +
    (query.sale ? 1 : 0) +
    (query.q ? 1 : 0) +
    (query.min !== minB || query.max !== maxB ? 1 : 0)
  );
}

/** Filters + sorts a catalogue according to the query. */
export function runQuery(
  query: ProductQuery,
  products: Product[] = PRODUCTS
): Product[] {
  const q = query.q.trim().toLowerCase();
  let result = products.filter((p) => {
    if (q) {
      const haystack = `${p.name} ${p.brand} ${p.category} ${p.color} ${p.shortDescription}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (query.cat.length && !query.cat.includes(p.category)) return false;
    if (query.brand.length && !query.brand.includes(p.brand)) return false;
    if (query.color.length && !query.color.includes(p.colorFamily)) return false;
    if (p.price < query.min || p.price > query.max) return false;
    if (query.sale && !p.compareAtPrice) return false;
    if (query.size.length) {
      const available = p.sizes.filter((s) => s.stock > 0).map((s) => s.size);
      if (!query.size.some((s) => available.includes(s))) return false;
    }
    return true;
  });

  switch (query.sort) {
    case "price-asc":
      result = result.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      result = result.sort((a, b) => b.price - a.price);
      break;
    case "rating":
      result = result.sort((a, b) => b.rating - a.rating);
      break;
    case "newest":
      result = result.sort(
        (a, b) => Number(b.tags.includes("new")) - Number(a.tags.includes("new")) || b.rating - a.rating
      );
      break;
    default:
      result = result.sort(
        (a, b) =>
          Number(b.tags.includes("bestseller") || b.tags.includes("limited")) -
            Number(a.tags.includes("bestseller") || a.tags.includes("limited")) || b.rating - a.rating
      );
  }
  return result;
}

/** Which US sizes exist across the catalogue (used by the size filter). */
export function availableSizes(products: Product[] = PRODUCTS): string[] {
  return Array.from(new Set(products.flatMap((p) => p.sizes.map((s) => s.size)))).sort();
}

export const COLOR_FAMILIES = [
  { value: "white", label: "White", hex: "#f5f5f4" },
  { value: "black", label: "Black", hex: "#1c1917" },
  { value: "red", label: "Red", hex: "#dc2626" },
  { value: "orange", label: "Orange", hex: "#ea580c" },
  { value: "burgundy", label: "Burgundy", hex: "#7f1d4d" },
  { value: "blue", label: "Blue", hex: "#2563eb" },
  { value: "brown", label: "Brown", hex: "#92400e" },
];
