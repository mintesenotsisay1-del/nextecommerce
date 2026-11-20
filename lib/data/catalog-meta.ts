import type { Category } from "@/lib/types";
import type { SortKey } from "@/lib/data/query";

/** Display order + labels for the category filters and quick chips. */
export const CATEGORY_ORDER: Category[] = [
  "sneakers",
  "running",
  "basketball",
  "boots",
  "dress",
  "heels",
];

export const CATEGORY_LABELS: Record<Category, string> = {
  sneakers: "Sneakers",
  running: "Running",
  basketball: "Basketball",
  boots: "Boots",
  dress: "Dress",
  heels: "Heels",
};

export const US_SIZES = ["US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12"];
export const EU_SIZES = ["EU 36", "EU 37", "EU 38", "EU 39", "EU 40", "EU 41"];

export const SORT_OPTIONS: { value: SortKey; label: string; shortLabel: string }[] = [
  { value: "featured", label: "Featured", shortLabel: "Featured" },
  { value: "newest", label: "Newest first", shortLabel: "Newest" },
  { value: "rating", label: "Top rated", shortLabel: "Top rated" },
  { value: "price-asc", label: "Price: low to high", shortLabel: "Price ↑" },
  { value: "price-desc", label: "Price: high to low", shortLabel: "Price ↓" },
];
