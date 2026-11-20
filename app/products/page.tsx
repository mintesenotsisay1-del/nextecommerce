import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CatalogClient } from "@/components/storefront/catalog-client";
import { getCatalogProducts } from "@/lib/data/storefront-products";
import { loadSiteSettings } from "@/lib/data/site-settings";
import { formatPrice } from "@/lib/format";

export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { companyName } = await loadSiteSettings();

  return {
    title: "All shoes",
    description: `Browse the full ${companyName} catalogue — filter by category, brand, size, colour, price or sale, search instantly, compare pairs and sort in a tap.`,
  };
}

export default async function ProductsPage() {
  const products = await getCatalogProducts();
  const brands = Array.from(new Set(products.map((product) => product.brand))).sort();
  const fromPrice = Math.min(...products.map((product) => product.price));
  const categoryCount = new Set(products.map((product) => product.category)).size;

  const stats = [
    { label: "Styles", value: String(products.length) },
    { label: "Brands", value: String(brands.length) },
    { label: "From", value: formatPrice(fromPrice) },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pt-3 pb-24 sm:px-6 lg:px-8 lg:pt-5">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link href="/" className="transition-colors hover:text-foreground hover:underline">
          Home
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        <span className="font-medium text-foreground">All shoes</span>
      </nav>

      <header className="mt-4 mb-5 sm:mt-5 sm:mb-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              The collection · Autumn 2026
            </p>
            <h1 className="font-heading mt-2 text-[2.15rem] leading-[1.04] font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]">
              Every pair we stock
            </h1>
            <p className="mt-3 hidden max-w-xl text-sm leading-relaxed text-muted-foreground sm:block sm:text-base">
              Sneakers, runners, boots, dress and heels — the full collection, ready to search,
              filter and compare.
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground sm:hidden">
              <span>{products.length} styles</span>
              <span aria-hidden>·</span>
              <span>{categoryCount} categories</span>
              <span aria-hidden>·</span>
              <span>from {formatPrice(fromPrice)}</span>
            </p>
          </div>

          <dl className="hidden shrink-0 grid-cols-3 gap-2 sm:grid sm:gap-3 lg:w-[21rem]">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border bg-muted/30 px-3 py-3 text-center sm:px-4 lg:text-left"
              >
                <dt className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {stat.label}
                </dt>
                <dd className="font-heading mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-4 hidden flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground sm:flex">
          <span className="inline-flex items-center gap-1.5">
            <Truck className="size-3.5" aria-hidden /> Free shipping over $250
          </span>
          <span className="inline-flex items-center gap-1.5">
            <RotateCcw className="size-3.5" aria-hidden /> 30-day returns
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden /> 100% authentic
          </span>
        </div>
      </header>

      <Suspense fallback={<ProductsSkeleton />}>
        <CatalogClient products={products} />
      </Suspense>
    </div>
  );
}

function ProductsSkeleton() {
  return (
    <div>
      <Skeleton className="mb-3 h-11 w-full rounded-full sm:mb-4 sm:h-10 sm:max-w-md" />

      <div className="mb-3 flex items-center justify-between gap-3 rounded-none border-b py-3 lg:border-b-0 lg:py-0">
        <Skeleton className="h-4 w-28" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-10 rounded-full" />
          <Skeleton className="hidden h-9 w-20 rounded-full md:block" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-10 rounded-full" />
        </div>
      </div>

      <div className="mb-4 flex gap-1.5 overflow-hidden lg:hidden">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-20 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <div className="hidden flex-col gap-4 lg:flex">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-6 sm:gap-y-8 lg:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
