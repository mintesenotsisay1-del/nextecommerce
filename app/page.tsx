import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, CreditCard, RotateCcw, ShieldCheck, Truck } from "lucide-react";
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
import { ProductCard } from "@/components/storefront/product-card";
import { SectionHeading } from "@/components/storefront/section-heading";
import { formatPrice } from "@/lib/format";

export default function HomePage() {
  const categories = getCategories();
  const featured = getFeaturedProducts(4);
  const bestSellers = getBestSellers(4);
  const newGames = getAllProducts().filter((p) => p.tags.includes("new")).slice(0, 4);
  const sale = getOnSale(4);
  const hero = featured[0];

  return (
    <div className="overflow-x-clip">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-6">
          <div className="reveal">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              Autumn Release 2026
            </Badge>
            <h1 className="font-heading mt-5 text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Footwear that carries <em className="text-muted-foreground not-italic">every</em> step.
            </h1>
            <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
              Sneakers, runners, boots, dress & heels — curated in small editions, shipped free over
              $250, and backed by 30-day returns.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="lg" className="rounded-full" render={<Link href="/products" />}>
                Shop the collection <ArrowRight aria-hidden />
              </Button>
              <Button size="lg" variant="outline" className="rounded-full" render={<Link href="/products?sale=1" />}>
                See what’s on sale
              </Button>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Truck className="size-4" aria-hidden /> Free shipping $250+</span>
              <span className="flex items-center gap-1.5"><RotateCcw className="size-4" aria-hidden /> 30-day returns</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="size-4" aria-hidden /> 100% authentic</span>
            </div>
          </div>

          <div className="reveal reveal-2 relative">
            <div className="relative mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-3xl bg-muted">
              <Image
                src="/img/products/am1-orange-white.jpg"
                alt="Air Max 1 floating product shot"
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 45vw"
                className="animate-float-soft object-cover"
              />
            </div>
            {/* Floating price chip */}
            <div className="absolute bottom-6 left-6 rounded-2xl bg-background/90 p-3 shadow-lg ring-1 ring-foreground/10 backdrop-blur sm:left-10">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                Editor’s pick
              </p>
              <p className="text-sm font-medium">Air Max 1 “White · Orange”</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-semibold">{formatPrice(hero.price)}</span>
                <Link href="/products/air-max-1-white-orange" className="text-xs underline underline-offset-2">
                  View
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

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
