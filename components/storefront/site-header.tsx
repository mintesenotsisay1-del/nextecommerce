"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, LayoutGrid, LogOut, Search, ShoppingBag, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/components/providers/cart-provider";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { BrandName } from "@/components/storefront/site-brand";
import {
  checkoutIdentityForUser,
  clearCheckoutIdentity,
  reconcileCheckoutIdentity,
} from "@/lib/checkout/identity";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SearchDialog } from "@/components/storefront/search-dialog";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/products", label: "All shoes" },
  { href: "/products?cat=sneakers", label: "Sneakers" },
  { href: "/products?cat=running", label: "Running" },
  { href: "/products?cat=boots", label: "Boots" },
  { href: "/products?cat=heels", label: "Heels" },
  { href: "/products?sale=1", label: "Sale" },
];

type UserData = { email: string; name?: string } | null;

export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [user, setUser] = React.useState<UserData>(null);
  const { count, openCart } = useCart();
  const { ids } = useWishlist();
  const { settings } = useSiteSettings();
  const router = useRouter();

  // Derived without state: the external "hydration" store flips once on the
  // client, keeping first-render markup identical between server and client.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ⌘K / Ctrl+K opens search
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return; // demo mode — user stays null

    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) reconcileCheckoutIdentity(checkoutIdentityForUser(u.id));
      setUser(
        u
          ? {
              email: u.email ?? "",
              name: (u.user_metadata?.full_name as string) || u.email?.split("@")[0],
            }
          : null
      );
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearCheckoutIdentity();
      } else if (session?.user) {
        reconcileCheckoutIdentity(checkoutIdentityForUser(session.user.id));
      }

      setUser(
        session?.user
          ? {
              email: session.user.email ?? "",
              name:
                (session.user.user_metadata?.full_name as string) ||
                session.user.email?.split("@")[0],
            }
          : null
      );
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    clearCheckoutIdentity();
    toast.success("Signed out");
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {/* Announcement marquee */}
      {/* <div className="relative overflow-hidden bg-foreground text-background">
        <div className="flex w-max animate-marquee items-center py-2 text-[11px] font-medium tracking-[0.18em] uppercase">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
              {[
                "Free shipping over $250",
                "30-day easy returns",
                "New drop: Air Max 1 White · Orange",
                "Members get early access",
                "Limited: AF-1 Swoosh Pack",
              ].map((text) => (
                <span key={text} className="flex items-center gap-6 px-6">
                  <Sparkles className="size-3" aria-hidden />
                  {text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div> */}

      <header
        data-scrolled={scrolled}
        className={cn(
          "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl transition-all",
          scrolled ? "border-border shadow-[0_1px_20px_rgba(0,0,0,0.04)]" : "border-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden" />
              }
            >
              <LayoutGrid className="size-5" aria-hidden />
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle className="font-heading text-xl">{settings.companyName}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-2.5 text-base font-medium hover:bg-muted"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="my-2 h-px bg-border" />
                <a href="/account" className="rounded-lg px-3 py-2.5 text-base font-medium hover:bg-muted">
                  Account
                </a>
                <a href="/admin" className="rounded-lg px-3 py-2.5 text-base font-medium hover:bg-muted">
                  Admin
                </a>
              </nav>
              {isSupabaseConfigured() && (
                <div className="mt-auto p-4">
                  <Button variant="outline" className="w-full" render={<Link href="/auth/login" />}>
                    <User aria-hidden /> Sign in
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="sr-only">{settings.companyName}</span>
            <span className="font-heading text-xl font-semibold tracking-tight whitespace-nowrap sm:text-2xl">
              <BrandName name={settings.companyName} />
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative rounded-full px-3.5 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
                {link.label === "Sale" && (
                  <sup className="absolute -top-1 -right-1 text-[9px] font-bold text-red-600">SALE</sup>
                )}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search products"
              className="hidden min-[360px]:inline-flex"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-5" aria-hidden />
            </Button>

            {/* Account */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="hidden md:block"
                  render={<Button variant="ghost" size="icon" aria-label="Account menu" />}
                >
                  <User className="size-5" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/account" />}>
                    <User aria-hidden /> My account
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/admin" />}>
                    <LayoutGrid aria-hidden /> Admin dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut aria-hidden /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Account"
                className="hidden md:flex"
                render={<Link href="/auth/login" />}
              >
                <User className="size-5" aria-hidden />
              </Button>
            )}

            {mounted && (
              <span className="relative">
                <Button variant="ghost" size="icon" aria-label="Wishlist" render={<Link href="/wishlist" />}>
                  <Heart className="size-5" aria-hidden />
                </Button>
                {ids.length > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full px-1 text-[10px]">
                    {ids.length}
                  </Badge>
                )}
              </span>
            )}

            <Button
              size="icon"
              className="relative rounded-full"
              aria-label="Open cart"
              onClick={openCart}
            >
              <ShoppingBag className="size-5" aria-hidden />
              {mounted && count > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-white px-1 text-[10px] text-foreground">
                  {count}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </header>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
