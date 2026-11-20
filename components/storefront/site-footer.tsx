import Link from "next/link";
import { AtSign, Globe, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SiteBrand } from "@/components/storefront/site-brand";
import { getCategories } from "@/lib/data/products";

export function SiteFooter() {
  const categories = getCategories();
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <p className="font-heading text-xl font-semibold">
              <SiteBrand />
            </p>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              A modern footwear boutique for people who care about every step. Used in SoHo, running
              on rails worldwide.
            </p>
            <div className="mt-5 flex gap-2">
              {[AtSign, Send, Globe].map((Icon, i) => (
                <a
                  key={i}
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Social link"
                  className="flex size-9 items-center justify-center rounded-full border bg-background transition-colors hover:bg-foreground hover:text-background"
                >
                  <Icon className="size-4" aria-hidden />
                </a>
              ))}
            </div>
          </div>

          <nav aria-label="Shop">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Shop</p>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm">
              <li><Link href="/products" className="hover:underline">All shoes</Link></li>
              {categories.slice(0, 5).map((c) => (
                <li key={c.value}>
                  <Link href={`/products?cat=${c.value}`} className="hover:underline">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li><Link href="/products?sale=1" className="hover:underline">Sale</Link></li>
            </ul>
          </nav>

          <nav aria-label="Company">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Company</p>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-foreground/80">
              <li><span className="cursor-default">About us</span></li>
              <li><span className="cursor-default">Sustainability</span></li>
              <li><span className="cursor-default">Careers</span></li>
              <li><Link href="/account" className="hover:underline">My account</Link></li>
            </ul>
          </nav>

          {/* <nav aria-label="Support">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Support</p>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-foreground/80">
              <li><span className="cursor-default">Shipping & returns</span></li>
              <li><span className="cursor-default">Size guide</span></li>
              <li><span className="cursor-default">Contact</span></li>
              <li><Link href="/admin" className="hover:underline">Admin</Link></li>
            </ul>
          </nav> */}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} <SiteBrand />.
          </p>
          <p className="flex gap-4">
            <span className="cursor-default hover:underline">Privacy</span>
            <span className="cursor-default hover:underline">Terms</span>
            <span className="cursor-default hover:underline">Cookies</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
