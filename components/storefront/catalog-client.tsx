"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  GitCompareArrows,
  Grid2x2,
  List as ListIcon,
  Search,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CatalogFilters } from "@/components/storefront/catalog-filters";
import {
  COMPARE_LIMIT,
  CompareDialog,
  CompareTray,
} from "@/components/storefront/product-compare";
import { ProductCard, ProductListCard } from "@/components/storefront/product-card";
import { CATEGORY_LABELS, CATEGORY_ORDER, SORT_OPTIONS } from "@/lib/data/catalog-meta";
import {
  COLOR_FAMILIES,
  activeFilterCount,
  parseQuery,
  priceBounds,
  queryToUrl,
  runQuery,
  type ProductQuery,
} from "@/lib/data/query";
import { formatPrice } from "@/lib/format";
import { useHydratedJson } from "@/lib/hooks/use-hydrated-json";
import type { Category, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const VIEW_STORAGE_KEY = "sole-stone-catalog-view";
type CatalogView = "grid" | "list";

const categoryLabel = (value: string) => CATEGORY_LABELS[value as Category] ?? value;
const colourLabel = (value: string) =>
  COLOR_FAMILIES.find((colour) => colour.value === value)?.label ?? value;

export function CatalogClient({ products }: { products: Product[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [minB, maxB] = React.useMemo(() => priceBounds(products), [products]);
  const query = React.useMemo(
    () => parseQuery(new URLSearchParams(params.toString()), products),
    [params, products]
  );
  const brands = React.useMemo(
    () => Array.from(new Set(products.map((product) => product.brand))).sort(),
    [products]
  );
  const brandCounts = React.useMemo(
    () =>
      products.reduce<Record<string, number>>((counts, product) => {
        counts[product.brand] = (counts[product.brand] ?? 0) + 1;
        return counts;
      }, {}),
    [products]
  );
  const productById = React.useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );
  const popular = React.useMemo(
    () =>
      [...products]
        .sort((a, b) => {
          const featured = (product: Product) =>
            Number(product.tags.includes("bestseller") || product.tags.includes("limited"));
          return featured(b) - featured(a) || b.rating - a.rating;
        })
        .slice(0, 4),
    [products]
  );

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [search, setSearch] = React.useState(query.q);
  const [compareMode, setCompareMode] = React.useState(false);
  const [compareIds, setCompareIds] = React.useState<string[]>([]);
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [view, setView] = useHydratedJson<CatalogView>(VIEW_STORAGE_KEY, "grid");

  const searchFocusedRef = React.useRef(false);
  const lastUrlQRef = React.useRef(query.q);
  const queryRef = React.useRef(query);

  // Keep the field in step with URL-driven changes (header search, back/forward,
  // clear chips) without clobbering someone who is mid-keystroke. The deferred
  // setter keeps the effect free of synchronous state updates.
  React.useEffect(() => {
    if (query.q === lastUrlQRef.current) return;
    lastUrlQRef.current = query.q;
    if (searchFocusedRef.current) return;
    const frame = requestAnimationFrame(() => setSearch(query.q));
    return () => cancelAnimationFrame(frame);
  }, [query.q]);

  React.useEffect(() => {
    queryRef.current = query;
  }, [query]);

  // Debounced, shareable search. The grid itself filters instantly through
  // useDeferredValue below, so typing never waits on the URL.
  React.useEffect(() => {
    const nextQ = search.trim();
    if (nextQ === queryRef.current.q) return;
    const timeout = window.setTimeout(() => {
      router.replace(queryToUrl({ ...queryRef.current, q: nextQ }, products), { scroll: false });
    }, 320);
    return () => window.clearTimeout(timeout);
  }, [search, router, products]);

  const deferredSearch = React.useDeferredValue(search);
  const effectiveQuery = React.useMemo(
    () => ({ ...query, q: deferredSearch.trim() }),
    [query, deferredSearch]
  );
  const results = React.useMemo(
    () => runQuery(effectiveQuery, products),
    [effectiveQuery, products]
  );

  const filterCount = activeFilterCount({ ...query, q: "" }, products);
  const viewMode: CatalogView = view === "list" ? "list" : "grid";

  const apply = React.useCallback(
    (next: ProductQuery, qOverride?: string) => {
      router.replace(
        queryToUrl({ ...next, q: qOverride ?? search.trim() }, products),
        { scroll: false }
      );
    },
    [router, search, products]
  );

  const toggleArrayValue = (field: "cat" | "brand" | "size" | "color", value: string) => {
    const current = query[field];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    apply({ ...query, [field]: next });
  };

  const clearSearch = () => {
    setSearch("");
    apply({ ...query, q: "" }, "");
  };

  const clearAll = () => {
    setSearch("");
    apply(
      {
        q: "",
        cat: [],
        brand: [],
        size: [],
        color: [],
        min: minB,
        max: maxB,
        sale: false,
        sort: query.sort,
      },
      ""
    );
  };

  const updateView = (next: CatalogView) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage can be blocked — the in-memory state still works */
    }
  };

  const compareProducts = React.useMemo(
    () =>
      compareIds
        .map((id) => productById.get(id))
        .filter((product): product is Product => Boolean(product)),
    [compareIds, productById]
  );

  const toggleCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter((value) => value !== id));
      return;
    }
    if (compareIds.length >= COMPARE_LIMIT) {
      toast(`Compare up to ${COMPARE_LIMIT} shoes`, {
        description: "Remove one from the tray to add another.",
      });
      return;
    }
    setCompareIds((current) => [...current, id]);
  };

  const removeCompare = (id: string) => {
    const next = compareProducts.filter((product) => product.id !== id);
    setCompareIds(next.map((product) => product.id));
    if (next.length < 2) setCompareOpen(false);
  };

  const clearCompare = () => {
    setCompareIds([]);
    setCompareOpen(false);
  };

  const filterPanel = (
    <CatalogFilters
      query={query}
      minB={minB}
      maxB={maxB}
      brands={brands}
      brandCounts={brandCounts}
      activeCount={filterCount}
      onToggle={toggleArrayValue}
      onRange={(range) => apply({ ...query, min: range[0], max: range[1] })}
      onSale={(value) => apply({ ...query, sale: value })}
      onClear={clearAll}
    />
  );

  const activeChips = [
    ...query.cat.map((value) => ({
      key: `cat-${value}`,
      label: categoryLabel(value),
      onRemove: () => toggleArrayValue("cat", value),
    })),
    ...query.brand.map((value) => ({
      key: `brand-${value}`,
      label: value,
      onRemove: () => toggleArrayValue("brand", value),
    })),
    ...query.size.map((value) => ({
      key: `size-${value}`,
      label: value,
      onRemove: () => toggleArrayValue("size", value),
    })),
    ...query.color.map((value) => ({
      key: `color-${value}`,
      label: colourLabel(value),
      onRemove: () => toggleArrayValue("color", value),
    })),
    ...(query.min !== minB || query.max !== maxB
      ? [
          {
            key: "price",
            label: `${formatPrice(query.min)}–${formatPrice(query.max)}`,
            onRemove: () => apply({ ...query, min: minB, max: maxB }),
          },
        ]
      : []),
    ...(query.sale
      ? [
          {
            key: "sale",
            label: "On sale",
            onRemove: () => apply({ ...query, sale: false }),
          },
        ]
      : []),
    ...(search.trim()
      ? [
          {
            key: "q",
            label: `“${search.trim()}”`,
            onRemove: clearSearch,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* ── Catalogue search ─────────────────────────────────── */}
      <div className="mb-3 sm:mb-4">
        <form
          role="search"
          aria-label="Search the catalogue"
          onSubmit={(event) => {
            event.preventDefault();
            apply({ ...query, q: search.trim() }, search.trim());
          }}
          className="relative w-full sm:max-w-md"
        >
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => {
              searchFocusedRef.current = true;
            }}
            onBlur={() => {
              searchFocusedRef.current = false;
            }}
            placeholder={`Search ${products.length} styles, brands or colours…`}
            aria-label="Search products"
            enterKeyHint="search"
            autoComplete="off"
            className="h-11 rounded-full border-transparent bg-muted/70 pr-12 pl-10 text-base shadow-none transition-colors focus-visible:border-ring focus-visible:bg-background sm:h-10 sm:pr-24 sm:text-xs"
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            {search && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
            <kbd className="hidden h-6 items-center rounded-md border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:flex">
              Enter
            </kbd>
          </div>
        </form>
      </div>

      {/* ── Toolbar — sticky under the header on mobile ──────── */}
      <div className="sticky top-16 z-30 -mx-4 mb-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:mb-6 lg:border-b-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <div className="flex items-center justify-between gap-2">
          <p
            className="min-w-0 truncate text-sm text-muted-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="font-semibold text-foreground">{results.length}</span>{" "}
            {results.length === 1 ? "result" : "results"}
            {search.trim() && <> for “{search.trim()}”</>}
          </p>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant={compareMode ? "default" : "outline"}
              className="h-10 rounded-full px-2.5 sm:h-9 sm:px-3"
              aria-pressed={compareMode}
              aria-label={compareMode ? "Exit comparison mode" : "Select products to compare"}
              onClick={() => setCompareMode((current) => !current)}
            >
              <GitCompareArrows aria-hidden />
              <span className="hidden lg:inline">Compare</span>
              {compareIds.length > 0 && (
                <Badge className="rounded-full bg-background px-1.5 text-foreground">
                  {compareIds.length}
                </Badge>
              )}
            </Button>

            <div
              className="hidden items-center rounded-full border bg-background p-0.5 md:flex"
              role="group"
              aria-label="Product view"
            >
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
                title="Grid view"
                onClick={() => updateView("grid")}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                  viewMode === "grid"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Grid2x2 className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={viewMode === "list"}
                title="List view"
                onClick={() => updateView("list")}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                  viewMode === "list"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ListIcon className="size-4" aria-hidden />
              </button>
            </div>

            <Select
              items={SORT_OPTIONS}
              value={query.sort}
              onValueChange={(value) => {
                if (typeof value === "string") {
                  apply({ ...query, sort: value as ProductQuery["sort"] });
                }
              }}
            >
              <SelectTrigger
                size="sm"
                aria-label="Sort products"
                className="h-10 max-w-28 gap-1.5 rounded-full border bg-background px-2.5 text-xs shadow-none sm:h-9 sm:max-w-none sm:px-3 sm:text-sm"
              >
                <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="w-48">
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full px-2.5 sm:h-9 sm:px-3 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={
                filterCount > 0
                  ? `Open filters, ${filterCount} active`
                  : "Open filters"
              }
            >
              <SlidersHorizontal aria-hidden />
              <span className="hidden sm:inline">Filters</span>
              {filterCount > 0 && (
                <Badge className="rounded-full px-1.5">{filterCount}</Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Category quick chips — horizontal scroller ──────── */}
      <div
        className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1.5 scrollbar-hide sm:-mx-6 sm:px-6 lg:hidden"
        role="group"
        aria-label="Category quick filters"
      >
        <QuickChip
          active={query.cat.length === 0}
          label="All"
          onClick={() => apply({ ...query, cat: [] })}
        />
        {CATEGORY_ORDER.map((category) => (
          <QuickChip
            key={category}
            active={query.cat.includes(category)}
            label={CATEGORY_LABELS[category]}
            onClick={() => toggleArrayValue("cat", category)}
          />
        ))}
        <QuickChip
          active={query.sale}
          label="Sale"
          onClick={() => apply({ ...query, sale: !query.sale })}
        />
      </div>

      {/* ── Compare mode helper ─────────────────────────────── */}
      {compareMode && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed bg-muted/30 px-3.5 py-2.5">
          <p className="flex items-center gap-2 text-xs">
            <GitCompareArrows className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              <strong className="font-semibold">{compareIds.length}</strong> of {COMPARE_LIMIT} selected
              — tap a shoe to add or remove it.
            </span>
          </p>
          <button
            type="button"
            onClick={() => setCompareMode(false)}
            className="rounded-full px-2 py-1 text-xs font-medium underline underline-offset-4 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            Done
          </button>
        </div>
      )}

      {/* ── Active filter chips ─────────────────────────────── */}
      {activeChips.length > 0 && (
        <div
          role="group"
          aria-label="Active filters"
          className="-mx-4 mb-5 flex items-center gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="group flex shrink-0 items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1.5 text-xs font-medium transition-colors hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              {chip.label}
              <X
                className="size-3 text-muted-foreground group-hover:text-foreground"
                aria-hidden
              />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="shrink-0 px-1 text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Grid + desktop sidebar ──────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside
          className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] h-fit self-start overflow-y-auto pr-2 lg:block"
          aria-label="Product filters"
        >
          {filterPanel}
        </aside>

        <div>
          {results.length === 0 ? (
            <CatalogEmptyState onClear={clearAll} popular={popular} />
          ) : (
            <div
              data-catalog-grid={viewMode}
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-2 gap-x-2 gap-y-5 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-2 xl:grid-cols-3"
                  : "flex flex-col gap-2.5 sm:gap-3"
              )}
            >
              {results.map((product, index) => (
                <div
                  key={product.id}
                  className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
                  style={{ animationDelay: `${Math.min(index, 6) * 40}ms`, animationFillMode: "both" }}
                >
                  {viewMode === "grid" ? (
                    <ProductCard
                      product={product}
                      priority={index < 3}
                      compareMode={compareMode}
                      compareSelected={compareIds.includes(product.id)}
                      onToggleCompare={() => toggleCompare(product.id)}
                    />
                  ) : (
                    <ProductListCard
                      product={product}
                      priority={index < 3}
                      compareMode={compareMode}
                      compareSelected={compareIds.includes(product.id)}
                      onToggleCompare={() => toggleCompare(product.id)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile filter drawer ────────────────────────────── */}
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen} swipeDirection="down">
        <DrawerContent side="bottom" showCloseButton={false} className="max-h-[88dvh]">
          <DrawerBody>
            <div className="flex shrink-0 justify-center pt-3 pb-1" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
            </div>

            <header className="flex shrink-0 items-start justify-between gap-3 border-b px-5 pb-3.5 pt-1">
              <div>
                <DrawerTitle className="font-heading text-lg font-semibold">Filters</DrawerTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {filterCount > 0
                    ? `${filterCount} active ${filterCount === 1 ? "filter" : "filters"}`
                    : "Refine the collection"}
                </p>
                <DrawerDescription className="sr-only">
                  Refine the product list by category, brand, size, colour, price and sale.
                </DrawerDescription>
              </div>
              <DrawerClose
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Close filters"
                    className="size-10 rounded-full"
                  />
                }
              >
                <X className="size-5" aria-hidden />
              </DrawerClose>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [-webkit-overflow-scrolling:touch]">
              {filterPanel}
            </div>

            <footer className="shrink-0 border-t bg-popover px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <Button className="h-12 w-full rounded-full" onClick={() => setMobileOpen(false)}>
                Show {results.length} {results.length === 1 ? "result" : "results"}
              </Button>
              {filterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-2 w-full rounded-full py-1 text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                >
                  Clear all filters
                </button>
              )}
            </footer>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <CompareTray
        products={compareProducts}
        onRemove={removeCompare}
        onClear={clearCompare}
        onCompare={() => setCompareOpen(true)}
      />
      <CompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        products={compareProducts}
        onRemove={removeCompare}
        onClear={clearCompare}
      />
    </>
  );
}

function CatalogEmptyState({
  onClear,
  popular,
}: {
  onClear: () => void;
  popular: Product[];
}) {
  return (
    <div className="rounded-3xl border border-dashed bg-muted/20 p-6 text-center sm:p-10">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-background ring-1 ring-border">
        <SearchX className="size-6 text-muted-foreground" aria-hidden />
      </span>
      <p className="font-heading mt-4 text-xl font-semibold">Nothing matches those filters</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Try a different search, widen the price range, or start with a clean slate.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button className="rounded-full" onClick={onClear}>
          Clear all filters
        </Button>
        <Link
          href="/products?sale=1"
          className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
        >
          Shop the sale
        </Link>
      </div>

      <div className="mt-8 border-t pt-6 text-left">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          <Sparkles className="size-3.5" aria-hidden /> Popular right now
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {popular.map((product) => (
            <Link key={product.id} href={`/products/${product.slug}`} className="group">
              <div className="zoom-container relative aspect-square overflow-hidden rounded-xl bg-muted">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 40vw, 20vw"
                  className="object-cover"
                />
              </div>
              <p className="mt-1.5 truncate text-xs font-medium">{product.name}</p>
              <p className="text-[11px] text-muted-foreground">{formatPrice(product.price)}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function QuickChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        active
          ? "border-foreground bg-foreground text-background"
          : "bg-background hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}
