import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAllProducts } from "@/lib/data/products";

export default function NotFound() {
  const suggestions = getAllProducts().slice(0, 3);
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:px-8">
      <p className="font-heading text-8xl font-semibold text-muted-foreground/30">404</p>
      <h1 className="font-heading mt-4 text-4xl font-semibold tracking-tight">
        This pair walked away
      </h1>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">
        The page you’re after doesn’t exist — but the collection doesn’t miss steps either.
      </p>
      <Button size="lg" className="mt-6 rounded-full" render={<Link href="/products" />}>
        Back to all shoes
      </Button>
      <nav className="mt-10 flex gap-3" aria-label="Suggestions">
        {suggestions.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.slug}`}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {p.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
