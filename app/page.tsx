import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, CreditCard, RotateCcw, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getAllProducts,
  getBestSellers,
  getCategories,
  getFeaturedProducts,
  getOnSale,
} from "@/lib/data/products";
import { getStorefrontCatalogue } from "@/lib/data/storefront-products";
import { HomeHero } from "@/components/storefront/home-hero";
import { ProductCard } from "@/components/storefront/product-card";
import { SectionHeading } from "@/components/storefront/section-heading";

export default async function HomePage() {
  const categories = getCategories();
  const featured = getFeaturedProducts(4);
  const bestSellers = getBestSellers(4);
  const newGames = getAllProducts().filter((p) => p.tags.includes("new")).slice(0, 4);
  const sale = getOnSale(4);
  const heroProducts = (await getStorefrontCatalogue()).map((product) => ({
    slug: product.slug,
    name: product.name,
    price: product.price,
    image: product.images[0] ?? "",
  }));

  return (
    <div className="overflow-x-clip">
      <HomeHero products={heroProducts} />

      {/* Brand strip */}
      <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
        <Separator className="opacity-50" />
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6 text-xs font-semibold tracking-[0.25em] text-muted-foreground uppercase sm:text-sm">
          {["Nike", "Jordan", "Vans", "Timberland", "Aldo", "Hugo Boss"].map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>
        <Separator className="opacity-50" />
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section className="mx-auto mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading kicker="Browse" title="Shop by category" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.value}
              href={`/products?cat=${c.value}`}
              className="zoom-container group relative overflow-hidden rounded-2xl bg-muted"
            >
              <div className="relative aspect-[3/4]">
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 16vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-sm font-semibold text-white">{c.name}</p>
                  <p className="text-[11px] text-white/70">{c.count} styles</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured ─────────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Curated"
          title="Editor’s picks"
          action={
            <Button variant="ghost" className="rounded-full" render={<Link href="/products" />}>
              View all <ArrowRight aria-hidden />
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 2} />
          ))}
        </div>
      </section>

      {/* ── Sale banner ──────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-foreground text-background">
          <div className="grid items-center gap-6 p-8 sm:grid-cols-2 sm:p-12">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-70">
                Mid-season clearance
              </p>
              <h2 className="font-heading mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Up to 29% off select runners
              </h2>
              <p className="mt-3 max-w-sm text-sm opacity-80">
                Flyknit, LunarEpic and satin stilettos — while stock lasts. Free returns on all sale
                items.
              </p>
              <Button
                size="lg"
                className="mt-6 rounded-full bg-background text-foreground hover:bg-background/85"
                render={<Link href="/products?sale=1" />}
              >
                Shop the sale <ArrowRight aria-hidden />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 max-sm:col-span-2">
              {sale.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className="zoom-container relative aspect-square overflow-hidden rounded-2xl"
                >
                  <Image src={p.images[0]} alt={p.name} fill sizes="20vw" className="object-cover" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── New arrivals ─────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Just landed"
          title="New arrivals"
          action={
            <Button variant="ghost" className="rounded-full" render={<Link href="/products?sort=newest" />}>
              More new <ArrowRight aria-hidden />
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
          {newGames.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ── Best sellers ─────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Proven"
          title="Best sellers"
          action={
            <Button variant="ghost" className="rounded-full" render={<Link href="/products?sort=rating" />}>
              Top rated <ArrowRight aria-hidden />
            </Button>
          }
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
          {bestSellers.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ── Service strip ────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Truck, title: "Free express shipping", body: "On every order above $250, worldwide." },
            { icon: RotateCcw, title: "30-day easy returns", body: "Wear them, walk them, still returnable." },
            { icon: BadgeCheck, title: "100% authentic", body: "Sourced only from brand-verified stock." },
            { icon: CreditCard, title: "Safe checkout", body: "Encrypted payments with instant confirmations." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border bg-card p-5">
              <Icon className="size-5" aria-hidden />
              <p className="mt-3 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading kicker="4.8/5 average" title="What our customers say" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              name: "Rachel W.",
              product: "Air Jordan 1 “Bred Toe”",
              quote: "First sneaker store I trust for sizing. The quick-add on hover is genius when I know my size.",
            },
            {
              name: "Chris D.",
              product: "Old Skool “Port Royale”",
              quote: "Cart on mobile keeps everything right there — checkout took 40 seconds on the train.",
            },
            {
              name: "Sandra O.",
              product: "Floral Pointed Pump",
              quote: "Filter by colour + size is wicked. Found EU 38 in a satin heel in one tap.",
            },
          ].map((t) => (
            <figure key={t.name} className="rounded-2xl border bg-card p-6">
              <blockquote className="text-sm leading-relaxed text-foreground/80">“{t.quote}”</blockquote>
              <figcaption className="mt-4 flex items-center justify-between border-t pt-4">
                <span className="text-xs font-semibold">{t.name}</span>
                <Badge variant="outline" className="max-w-36 truncate">
                  {t.product}
                </Badge>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── Newsletter ───────────────────────────────────────── */}
      <section className="mx-auto mt-16 mb-20 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border bg-muted/40 p-8 text-center sm:p-12">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">Join the inner circle</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Members get early access to limited drops, restock alerts and 10% off the first order.
          </p>
          <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="h-11 flex-1 rounded-full border bg-background px-4 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button size="lg" className="rounded-full" render={<Link href="/auth/signup" />}>
              Get early access
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">No spam. Unsubscribe anytime.</p>
        </div>
      </section>
    </div>
  );
}
