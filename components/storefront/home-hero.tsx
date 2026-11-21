"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { formatPrice } from "@/lib/format";
import { splitHighlight } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

export type HeroProduct = {
  slug: string;
  name: string;
  price: number;
  image: string;
};

/**
 * Home-page hero driven by the admin-editable site settings. The product
 * passed in supplies the photo, price chip and link; the copy, layout,
 * trust badges and image override come from the live settings context.
 */
export function HomeHero({ products }: { products: HeroProduct[] }) {
  const { settings } = useSiteSettings();
  const hero = settings.hero;
  const featured =
    products.find((product) => product.slug === hero.featuredSlug) ?? products[0];

  const imageSrc = hero.image || featured?.image || "/img/products/am1-orange-white.jpg";
  const imageAlt = hero.imageAlt || featured?.name || "Featured footwear";
  const title = splitHighlight(hero.title, hero.highlight);
  const showSecondary = Boolean(hero.secondaryLabel && hero.secondaryHref);
  const showImage = hero.showImage;
  const imageLeft = hero.imagePosition === "left";

  if (!hero.enabled) return null;

  const shippingText =
    hero.shippingText ||
    (settings.freeShippingThreshold === 0
      ? "Free shipping on all orders"
      : `Free shipping over ${formatPrice(settings.freeShippingThreshold)}`);

  const trustBadges = [
    { icon: Truck, text: shippingText },
    { icon: RotateCcw, text: hero.returnsText },
    { icon: ShieldCheck, text: hero.authenticText },
  ].filter((badge) => badge.text.trim().length > 0);

  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <div
        className={cn(
          "grid items-center gap-10",
          showImage && "lg:grid-cols-2 lg:gap-6"
        )}
      >
        <div
          className={cn(
            "reveal",
            showImage && imageLeft && "lg:order-2",
            !showImage && "max-w-3xl"
          )}
        >
          {hero.badge && (
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
              {hero.badge}
            </Badge>
          )}
          <h1 className="font-heading mt-5 text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            {title.before}
            {title.match && (
              <em className="text-muted-foreground not-italic">{title.match}</em>
            )}
            {title.after}
          </h1>
          {hero.description && (
            <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
              {hero.description}
            </p>
          )}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="rounded-full"
              nativeButton={false}
              render={<Link href={hero.primaryHref} />}
            >
              {hero.primaryLabel} <ArrowRight aria-hidden />
            </Button>
            {showSecondary && (
              <Button
                size="lg"
                variant="outline"
                className="rounded-full"
                nativeButton={false}
                render={<Link href={hero.secondaryHref} />}
              >
                {hero.secondaryLabel}
              </Button>
            )}
          </div>
          {hero.showTrustBadges && trustBadges.length > 0 && (
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-2 text-xs text-muted-foreground">
              {trustBadges.map(({ icon: Icon, text }, index) => (
                <span key={`${text}-${index}`} className="flex items-center gap-1.5">
                  <Icon className="size-4" aria-hidden /> {text}
                </span>
              ))}
            </div>
          )}
        </div>

        {showImage && (
          <div className={cn("reveal reveal-2 relative", imageLeft && "lg:order-1")}>
            <div className="relative mx-auto aspect-square w-full max-w-lg overflow-hidden rounded-3xl bg-muted">
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 45vw"
                className={cn(
                  "animate-float-soft",
                  hero.imageFit === "contain" ? "object-contain" : "object-cover"
                )}
              />
            </div>
            {hero.showEditorPick && featured && (
              <div className="absolute bottom-6 left-6 rounded-2xl bg-background/90 p-3 shadow-lg ring-1 ring-foreground/10 backdrop-blur sm:left-10">
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {hero.editorPickLabel}
                </p>
                <p className="text-sm font-medium">{featured.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-semibold">{formatPrice(featured.price)}</span>
                  <Link
                    href={`/products/${featured.slug}`}
                    className="text-xs underline underline-offset-2"
                  >
                    View
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
