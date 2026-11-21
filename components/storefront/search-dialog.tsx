"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAllProducts } from "@/lib/data/products";
import { formatPrice } from "@/lib/format";
import Image from "next/image";
import type { Product } from "@/lib/types";

const QUICK_LINKS = [
  { label: "Sneakers", href: "/products?cat=sneakers" },
  { label: "Running", href: "/products?cat=running" },
  { label: "Basketball", href: "/products?cat=basketball" },
  { label: "Boots", href: "/products?cat=boots" },
  { label: "Dress", href: "/products?cat=dress" },
  { label: "Heels", href: "/products?cat=heels" },
  { label: "Sale", href: "/products?sale=1" },
];

let cachedProducts: Product[] | null = null;
let fetchPromise: Promise<Product[]> | null = null;

async function fetchProducts(): Promise<Product[]> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/products")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Product[]>;
    })
    .then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        cachedProducts = data;
        return data;
      }
      return cachedProducts ?? getAllProducts();
    })
    .catch((err) => {
      console.error("[SearchDialog] Failed to fetch products:", err);
      return cachedProducts ?? getAllProducts();
    })
    .finally(() => {
      fetchPromise = null;
    });
  return fetchPromise;
}

export function SearchDialog({
  open,
  onOpenChange,
  products: initialProducts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products?: Product[];
}) {
  const [term, setTerm] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [fetchedProducts, setFetchedProducts] = React.useState<Product[] | null>(() => cachedProducts);

  React.useEffect(() => {
    let active = true;
    if (open || !cachedProducts) {
      fetchProducts().then((data) => {
        if (active && data && data.length > 0) {
          setFetchedProducts(data);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [open]);

  const products =
    initialProducts && initialProducts.length > 0
      ? initialProducts
      : fetchedProducts && fetchedProducts.length > 0
      ? fetchedProducts
      : getAllProducts();

  const results = React.useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    return products
      .filter((p) => {
        const haystack = `${p.name} ${p.brand} ${p.category} ${p.color ?? ""} ${p.shortDescription ?? ""}`.toLowerCase();
        return haystack.includes(q) || tokens.every((tok) => haystack.includes(tok));
      })
      .slice(0, 8);
  }, [term, products]);

  React.useEffect(() => {
    if (!open) return;
    // Imperative focus only (no setState) — deferred to a frame so the
    // dialog's transition is already committed.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Terminal reset on close happens inside this event callback, so no
  // setState-in-effect is needed for clearing the query.
  function handleOpenChange(next: boolean) {
    if (!next) setTerm("");
    onOpenChange(next);
  }

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (term.trim()) go(`/products?q=${encodeURIComponent(term.trim())}`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-4 grid max-h-[calc(100dvh-2rem)] translate-y-0 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl p-0 sm:top-12 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Search products</DialogTitle>
        <DialogDescription className="sr-only">
          Instant search across the whole catalogue
        </DialogDescription>

        <DialogClose
          aria-label="Close search"
          className="absolute top-2.5 right-2.5 flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <X className="size-4" />
        </DialogClose>

        <form
          onSubmit={submitSearch}
          className="flex items-center gap-2 border-b px-4 py-3 pr-16"
        >
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            ref={inputRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search sneakers, boots, heels…"
            className="h-11 flex-1 rounded-full border bg-background px-4 py-1 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="Clear search"
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
          <kbd className="hidden rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
            ESC
          </kbd>
        </form>

        <div className="max-h-[min(70dvh,calc(100dvh-9rem))] overflow-y-auto overscroll-contain">
          {results.length > 0 && (
            <div className="p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              {results.map((p) => {
                const imageSrc = p.images?.[0] || "/img/products/am1-orange-white.jpg";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => go(`/products/${p.slug}`)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-muted active:bg-muted sm:gap-3 sm:px-3 sm:py-2"
                  >
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-12">
                      <Image
                        src={imageSrc}
                        alt={p.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.brand}{p.color ? ` · ${p.color}` : ""}
                      </span>
                    </span>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="text-[13px] font-semibold sm:text-sm">
                        {formatPrice(p.price)}
                      </span>
                      {p.compareAtPrice && p.compareAtPrice > p.price ? (
                        <span className="text-[11px] text-muted-foreground line-through">
                          {formatPrice(p.compareAtPrice)}
                        </span>
                      ) : null}
                    </div>
                    <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
                  </button>
                );
              })}
              <button
                type="button"
                onClick={submitSearch}
                className="mt-1 w-full break-words rounded-xl px-3 py-3 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted"
              >
                View all results for “{term}”
              </button>
            </div>
          )}

          {term && results.length === 0 && (
            <p className="px-6 py-10 text-center text-sm break-words text-muted-foreground">
              No matches for “{term}”. Try “Air”, “boot” or “heels”.
            </p>
          )}

          {!term && (
            <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Quick links
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK_LINKS.map((l) => (
                  <button
                    key={l.href}
                    type="button"
                    onClick={() => go(l.href)}
                    className="flex min-h-11 items-center rounded-full sm:min-h-0"
                  >
                    <Badge
                      variant="outline"
                      className="h-full min-h-11 cursor-pointer justify-center px-3.5 text-xs hover:bg-muted sm:min-h-0 sm:py-1.5"
                    >
                      {l.label}
                    </Badge>
                  </button>
                ))}
              </div>
              <p className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted px-4 py-3 text-xs text-muted-foreground">
                <span className="sm:hidden">Search the full catalogue</span>
                <span className="hidden sm:inline">
                  <kbd className="rounded-md bg-background px-1.5 py-0.5 font-mono">⌘</kbd>/
                  <kbd className="rounded-md bg-background px-1.5 py-0.5 font-mono">K</kbd> to open this
                  anywhere
                </span>
                <span className="font-medium">{products.length} shoes in stock</span>
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
