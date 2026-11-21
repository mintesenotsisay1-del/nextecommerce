"use client";

import * as React from "react";
import { Check, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  EU_SIZES,
  US_SIZES,
} from "@/lib/data/catalog-meta";
import { COLOR_FAMILIES, type ProductQuery } from "@/lib/data/query";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type CatalogFiltersProps = {
  query: ProductQuery;
  minB: number;
  maxB: number;
  brands: string[];
  brandCounts?: Record<string, number>;
  activeCount: number;
  onToggle: (field: "cat" | "brand" | "size" | "color", value: string) => void;
  onRange: (range: [number, number]) => void;
  onSale: (value: boolean) => void;
  onClear: () => void;
};

/** Shared filter body for the desktop sidebar and the mobile drawer. */
export function CatalogFilters({
  query,
  minB,
  maxB,
  brands,
  brandCounts,
  activeCount,
  onToggle,
  onRange,
  onSale,
  onClear,
}: CatalogFiltersProps) {
  const uid = React.useId().replace(/:/g, "");
  const { settings } = useSiteSettings();

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Refine</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activeCount > 0 ? `${activeCount} active ${activeCount === 1 ? "filter" : "filters"}` : "No filters applied"}
          </p>
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <RotateCcw className="size-3" aria-hidden />
            Reset
          </button>
        )}
      </div>

      <Separator className="my-5" />

      <section aria-label="Category">
        <p className="mb-3 text-xs font-semibold tracking-wider uppercase">Category</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_ORDER.map((category) => (
            <FilterChip
              key={category}
              active={query.cat.includes(category)}
              label={CATEGORY_LABELS[category]}
              onClick={() => onToggle("cat", category)}
            />
          ))}
        </div>
      </section>

      <Separator className="my-5" />

      <section aria-label="Brand">
        <p className="mb-3 text-xs font-semibold tracking-wider uppercase">Brand</p>
        <div className="flex flex-col gap-1">
          {brands.map((brand) => (
            <div
              key={brand}
              className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-muted/60"
            >
              <Checkbox
                id={`${uid}-brand-${brand}`}
                checked={query.brand.includes(brand)}
                onCheckedChange={() => onToggle("brand", brand)}
              />
              <Label
                htmlFor={`${uid}-brand-${brand}`}
                className="flex-1 cursor-pointer text-sm font-normal"
              >
                {brand}
              </Label>
              {brandCounts?.[brand] !== undefined && (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {brandCounts[brand]}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <Separator className="my-5" />

      <section aria-label="Size">
        <p className="mb-3 text-xs font-semibold tracking-wider uppercase">Size</p>
        <p className="mb-2 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">US</p>
        <div className="grid grid-cols-4 gap-1.5">
          {US_SIZES.map((size) => (
            <FilterChip
              key={size}
              sizeLabel
              active={query.size.includes(size)}
              label={size.replace("US ", "")}
              onClick={() => onToggle("size", size)}
            />
          ))}
        </div>
        <p className="mt-3 mb-2 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">EU</p>
        <div className="grid grid-cols-4 gap-1.5">
          {EU_SIZES.map((size) => (
            <FilterChip
              key={size}
              sizeLabel
              active={query.size.includes(size)}
              label={size.replace("EU ", "")}
              onClick={() => onToggle("size", size)}
            />
          ))}
        </div>
      </section>

      <Separator className="my-5" />

      <section aria-label="Colour">
        <p className="mb-3 text-xs font-semibold tracking-wider uppercase">Colour</p>
        <div className="flex flex-wrap gap-2.5">
          {COLOR_FAMILIES.map((colour) => {
            const active = query.color.includes(colour.value);
            return (
              <button
                key={colour.value}
                type="button"
                aria-label={`Filter by ${colour.label}`}
                aria-pressed={active}
                onClick={() => onToggle("color", colour.value)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 transition-transform focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-90",
                  active ? "scale-95 border-foreground" : "border-border hover:scale-105"
                )}
                style={{ backgroundColor: colour.hex }}
                title={colour.label}
              >
                {active && (
                  <Check className="size-3.5 text-white mix-blend-difference" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <Separator className="my-5" />

      <section aria-label="Price">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-wider uppercase">Price</p>
          <p className="text-[11px] text-muted-foreground">{settings.currency}</p>
        </div>
        <PriceFilter
          key={`${query.min}-${query.max}`}
          min={minB}
          max={maxB}
          initial={[query.min, query.max]}
          onCommit={onRange}
        />
      </section>

      <Separator className="my-5" />

      <div className="flex items-center justify-between gap-3">
        <div>
          <label htmlFor={`${uid}-sale-only`} className="cursor-pointer text-sm font-medium">
            On sale only
          </label>
          <p className="text-xs text-muted-foreground">Show discounted pairs</p>
        </div>
        <Checkbox
          id={`${uid}-sale-only`}
          checked={query.sale}
          onCheckedChange={(checked) => onSale(checked === true)}
          aria-label="Filter on-sale items"
        />
      </div>
    </div>
  );
}

function PriceFilter({
  min,
  max,
  initial,
  onCommit,
}: {
  min: number;
  max: number;
  initial: [number, number];
  onCommit: (range: [number, number]) => void;
}) {
  const [range, setRange] = React.useState<[number, number]>(initial);

  return (
    <div>
      <Slider
        min={min}
        max={max}
        step={10}
        value={range}
        onValueChange={(value) => setRange(value as [number, number])}
        onValueCommitted={(value) => onCommit(value as [number, number])}
        thumbLabels={["Minimum price", "Maximum price"]}
        aria-label="Price range"
      />
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground tabular-nums">
        <span className="rounded-full border bg-background px-2 py-1">{formatPrice(range[0])}</span>
        <span className="h-px flex-1 bg-border mx-2" aria-hidden />
        <span className="rounded-full border bg-background px-2 py-1">{formatPrice(range[1])}</span>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
  sizeLabel,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  sizeLabel?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        sizeLabel ? "flex h-9 items-center justify-center px-0" : "px-3 py-1.5",
        active ? "border-foreground bg-foreground text-background" : "hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}
