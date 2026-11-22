import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  RotateCcw,
  Truck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getBestSellerSelection,
  getBrandTiles,
  getCatalogueStats,
  getCategoryTiles,
  getFeaturedSelection,
  getMaxDiscount,
  getNewArrivalSelection,
  getSaleSelection,
  getValueSelection,
} from "@/lib/data/home";
import { getCatalogProducts } from "@/lib/data/storefront-products";
import { loadSiteSettings } from "@/lib/data/site-settings";
import { discountPercent, formatPrice } from "@/lib/format";
import { HomeHero } from "@/components/storefront/home-hero";
import { HomeProductGrid } from "@/components/storefront/home-product-grid";
import { HomeSectionGate } from "@/components/storefront/home-section-gate";
import { ProductCard } from "@/components/storefront/product-card";
import { RecentlyViewedRail } from "@/components/storefront/recently-viewed-rail";
import { SectionHeading } from "@/components/storefront/section-heading";
import { Input } from "@/components/ui/input";

// The catalogue is admin-managed in Supabase. Render it fresh on every request
// so new rows, price edits and stock changes appear on the home page at once.
export const revalidate = 0;

export default async function HomePage() {
  const [products, settings] = await Promise.all([
    getCatalogProducts(),
    loadSiteSettings(),
  ]);
  const { currency, freeShippingThreshold } = settings;
  const { homeLayout } = settings;

  const categories = getCategoryTiles(products);
  const featured = getFeaturedSelection(products, 4);
  const newArrivals = getNewArrivalSelection(products, 4);
  const bestSellers = getBestSellerSelection(products, 4);
  const sale = getSaleSelection(products, 4);
  const maxDiscount = getMaxDiscount(products);
  const saleCount = products.filter(
    (product) => (discountPercent(product.price, product.compareAtPrice) ?? 0) > 0
  ).length;
  const brands = getBrandTiles(products, 6);
  const allBrands = Array.from(new Set(products.map((product) => product.brand))).sort(
    (a, b) => a.localeCompare(b)
  );
  const value = getValueSelection(products, 4);
  const stats = getCatalogueStats(products);
  const minPrice = products.length ? Math.min(...products.map((product) => product.price)) : 0;

  const heroProducts = products.map((product) => ({
    slug: product.slug,
    name: product.name,
    price: product.price,
    image: product.images[0] ?? "",
  }));
  const railProducts = products.map(({ slug, name, price, images }) => ({
    slug,
    name,
    price,
    images,
  }));

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: settings.companyName,
        url: baseUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${baseUrl}/products?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      ...(homeLayout.showFeatured && featured.length
        ? [
            {
              "@type": "ItemList",
              name: "Editor's picks",
              numberOfItems: featured.length,
              itemListElement: featured.map((product, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: product.name,
                url: `${baseUrl}/products/${product.slug}`,
              })),
            },
          ]
        : []),
    ],
  };

  const shippingBody =
    freeShippingThreshold > 0
      ? `On every order above ${formatPrice(freeShippingThreshold, currency)}, worldwide.`
      : "On every order, worldwide.";

  const productGridClass =
    settings.homeLayout.gridColumns === 2
      ? "grid grid-cols-1 gap-x-3 gap-y-8 sm:grid-cols-2 sm:gap-x-5"
      : "grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4";

  return (
    <div className="overflow-x-clip">
      <HomeHero products={heroProducts} />

      {/* ── Holiday delivery notice (admin-managed) ──────────── */}
      {settings.vacation.enabled && settings.vacation.message.trim() && (
        <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 [&>svg]:text-amber-600">
            <CalendarClock aria-hidden />
            <AlertTitle>Holiday delivery update</AlertTitle>
            <AlertDescription className="text-amber-800/90">
              {settings.vacation.message}
            </AlertDescription>
          </Alert>
        </section>
      )}

      {/* ── Brand strip ──────────────────────────────────────── */}
      {allBrands.length > 0 && (
        <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
          <Separator className="opacity-50" />
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-6 text-xs font-semibold tracking-[0.25em] text-muted-foreground uppercase sm:text-sm">
            {allBrands.map((brand) => (
              <Link
                key={brand}
                href={`/products?brand=${encodeURIComponent(brand)}`}
                className="transition-colors hover:text-foreground"
              >
                {brand}
              </Link>
            ))}
          </div>
          <Separator className="opacity-50" />
        </section>
      )}

      {/* ── Catalogue at a glance ────────────────────────────── */}
      {stats.styles > 0 && (
        <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Styles", value: stats.styles },
              { label: "Brands", value: stats.brands },
              { label: "Categories", value: stats.categories },
              { label: "Avg. rating", value: stats.rating.toFixed(1) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border bg-card px-4 py-3 text-center"
              >
                <dt className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {stat.label}
                </dt>
                <dd className="font-heading mt-1 text-2xl font-semibold tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ── Categories ───────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Browse"
            title="Shop by category"
            action={
              <Button
                variant="ghost"
                className="rounded-full"
                render={<Link href="/products" />}
              >
                All shoes <ArrowRight aria-hidden />
              </Button>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category.value}
                href={`/products?cat=${category.value}`}
                className="zoom-container group relative overflow-hidden rounded-2xl bg-muted"
              >
                <div className="relative aspect-[3/4]">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 16vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-sm font-semibold text-white">{category.name}</p>
                    <p className="text-[11px] text-white/70">
                      {category.count} {category.count === 1 ? "style" : "styles"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured ─────────────────────────────────────────── */}
      {homeLayout.showFeatured && featured.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Curated"
            title="Editor’s picks"
            action={
              <Button
                variant="ghost"
                className="rounded-full"
                render={<Link href="/products" />}
              >
                View all <ArrowRight aria-hidden />
              </Button>
            }
          />
          <div className={productGridClass}>
            {featured.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index < 2} />
            ))}
          </div>
        </section>
      )}

      {/* ── Sale banner ──────────────────────────────────────── */}
      {sale.length > 0 && maxDiscount > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-foreground text-background">
            <div className="grid items-center gap-6 p-8 sm:grid-cols-2 sm:p-12">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-70">
                  Mid-season clearance
                </p>
                <h2 className="font-heading mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Up to {maxDiscount}% off selected styles
                </h2>
                <p className="mt-3 max-w-sm text-sm opacity-80">
                  {saleCount} reduced {saleCount === 1 ? "style" : "styles"} — while stock lasts.
                  Free returns on every sale order.
                </p>
                <Button
                  size="lg"
                  className="mt-6 rounded-full bg-background text-foreground hover:bg-background/85"
                  render={<Link href="/products?sale=1" />}
                >
                  Shop the sale <ArrowRight aria-hidden />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {sale.map((product) => {
                  const discount = discountPercent(product.price, product.compareAtPrice) ?? 0;
                  return (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      aria-label={`${product.name} — ${discount}% off`}
                      className="zoom-container relative aspect-square overflow-hidden rounded-2xl"
                    >
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 40vw, 20vw"
                        className="object-cover"
                      />
                      <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-red-600 shadow-sm backdrop-blur">
                        −{discount}%
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── New arrivals ─────────────────────────────────────── */}
      {homeLayout.showNewArrivals && newArrivals.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Just landed"
            title="New arrivals"
            action={
              <Button
                variant="ghost"
                className="rounded-full"
                render={<Link href="/products?sort=newest" />}
              >
                More new <ArrowRight aria-hidden />
              </Button>
            }
          />
          <div className={productGridClass}>
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── Best sellers ─────────────────────────────────────── */}
      {bestSellers.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="Proven"
            title="Best sellers"
            action={
              <Button
                variant="ghost"
                className="rounded-full"
                render={<Link href="/products?sort=rating" />}
              >
                Top rated <ArrowRight aria-hidden />
              </Button>
            }
          />
          <div className={productGridClass}>
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── Shop by brand ────────────────────────────────────── */}
      {brands.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker="The houses"
            title="Shop by brand"
            action={
              <Button
                variant="ghost"
                className="rounded-full"
                render={<Link href="/products" />}
              >
                All brands <ArrowRight aria-hidden />
              </Button>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {brands.map((brand) => (
              <Link
                key={brand.name}
                href={`/products?brand=${encodeURIComponent(brand.name)}`}
                className="zoom-container group relative overflow-hidden rounded-2xl bg-muted"
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={brand.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, 16vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-sm font-semibold text-white">{brand.name}</p>
                    <p className="text-[11px] text-white/75">
                      {brand.count} {brand.count === 1 ? "style" : "styles"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Best value ───────────────────────────────────────── */}
      {value.length > 0 && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker={`From ${formatPrice(minPrice, currency)}`}
            title="Best value picks"
            action={
              <Button
                variant="ghost"
                className="rounded-full"
                render={<Link href="/products?sort=price-asc" />}
              >
                Low to high <ArrowRight aria-hidden />
              </Button>
            }
          />
          <div className={productGridClass}>
            {value.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ── Service strip ────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Truck, title: "Free express shipping", body: shippingBody },
            {
              icon: RotateCcw,
              title: "30-day easy returns",
              body: "Wear them, walk them, still returnable.",
            },
            {
              icon: BadgeCheck,
              title: "100% authentic",
              body: "Sourced only from brand-verified stock.",
            },
            {
              icon: CreditCard,
              title: "Safe checkout",
              body: "Encrypted payments with instant confirmations.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card p-5">
              <Icon className="size-5" aria-hidden />
              <p className="mt-3 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recently viewed (hydrates from localStorage) ─────── */}
      <RecentlyViewedRail products={railProducts} />

      {/* ── Newsletter ───────────────────────────────────────── */}
      <section className="mx-auto mt-16 mb-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border bg-muted/40 p-8 text-center sm:p-12">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            Join the inner circle
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Members get early access to limited drops, restock alerts and 10% off the first order.
          </p>
          <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>

            <Input
              id="newsletter-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="h-11 flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button size="lg" className="rounded-full" render={<Link href="/auth/signup" />}>
              Get early access
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
