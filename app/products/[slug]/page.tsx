import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getStorefrontCatalogue, getStorefrontProductBySlug } from "@/lib/data/storefront-products";
import { PdpHero } from "@/components/storefront/pdp-hero";
import { ProductAccordions } from "@/components/storefront/product-accordions";
import { ProductCard } from "@/components/storefront/product-card";
import { ReviewSection } from "@/components/storefront/review-section";
import { RecentlyViewedRail } from "@/components/storefront/recently-viewed-rail";
import { SectionHeading } from "@/components/storefront/section-heading";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const match = await getStorefrontProductBySlug(slug);
  if (!match) return { title: "Product not found" };
  const product = match.product;
  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: { images: [product.images[0]] },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const match = await getStorefrontProductBySlug(slug);
  if (!match) notFound();
  const { product, sourceId } = match;

  const catalogue = await getStorefrontCatalogue();
  const related = catalogue
    .filter((p) => p.id !== product.id)
    .sort((a, b) => {
      const score = (x: typeof a) =>
        (x.brand === product.brand ? 2 : 0) + (x.category === product.category ? 3 : 0);
      return score(b) - score(a);
    })
    .slice(0, 4);
  const railProducts = catalogue.map(({ slug, name, price, images }) => ({
    slug,
    name,
    price,
    images,
  }));

  return (
    <div className="pb-40 lg:pb-20">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto flex w-full max-w-7xl items-center gap-1 px-4 pt-4 text-xs text-muted-foreground sm:px-6 lg:px-8 lg:pt-6"
      >
        <Link href="/" className="hover:text-foreground hover:underline">
          Home
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        <Link
          href={`/products?cat=${product.category}`}
          className="capitalize hover:text-foreground hover:underline"
        >
          {product.category}
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        <span className="inline-block max-w-52 truncate text-foreground sm:max-w-none">
          {product.name}
        </span>
      </nav>

      {/* Hero: gallery + buy panel (client-owned state) */}
      <PdpHero product={product} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ProductAccordions product={product} />

        <ReviewSection
          productId={sourceId ?? product.id}
          fallbackProductId={sourceId ? product.id : undefined}
          baseRating={product.rating}
          baseCount={product.reviewCount}
        />

        {/* Related */}
        <section className="mt-16">
          <SectionHeading kicker="You may also like" title="Complete the rotation" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </div>

      <RecentlyViewedRail excludeSlug={product.slug} products={railProducts} />
    </div>
  );
}
