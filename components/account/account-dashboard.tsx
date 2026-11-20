"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  Bell,
  ChevronRight,
  Headphones,
  Heart,
  Info,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Package,
  RotateCcw,
  Save,
  ShoppingBag,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { OrderHistory } from "@/components/account/order-history";
import { useCart } from "@/components/providers/cart-provider";
import { useRecentlyViewed } from "@/components/providers/recently-viewed-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import {
  EMPTY_SAVED_ADDRESS,
  normalizeSavedAddress,
  readLocalSavedAddress,
  writeLocalSavedAddress,
  type SavedAddress,
} from "@/lib/account/address";
import {
  GUEST_IDENTITY,
  checkoutIdentityForUser,
  clearCheckoutIdentity,
  readCheckoutOwner,
  reconcileCheckoutIdentity,
  writeCheckoutOwner,
} from "@/lib/checkout/identity";
import { validateFields } from "@/lib/checkout/validation";
import { getProductBySlug } from "@/lib/data/products";
import { useHydratedJson } from "@/lib/hooks/use-hydrated-json";
import { ACTIVE_ORDER_STATUSES, useOrders } from "@/lib/hooks/use-orders";
import { formatPrice } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const PREFS_KEY = "sole-stone-account-prefs-v1";

type NotificationPrefs = {
  orderUpdates: boolean;
  newDrops: boolean;
  restock: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  orderUpdates: true,
  newDrops: true,
  restock: false,
};

const PREF_ROWS: {
  key: keyof NotificationPrefs;
  label: string;
  description: string;
}[] = [
  {
    key: "orderUpdates",
    label: "Order updates",
    description: "Shipping, delivery and any changes to your order.",
  },
  {
    key: "newDrops",
    label: "New drops",
    description: "Early access to limited releases and member-only restocks.",
  },
  {
    key: "restock",
    label: "Back in stock",
    description: "A nudge when a sold-out size returns.",
  },
];

const LOYALTY_TIERS = [
  { name: "Member", min: 0, perk: "Free shipping over $250" },
  { name: "Silver", min: 300, perk: "Early access to every drop" },
  { name: "Gold", min: 750, perk: "Free express shipping" },
  { name: "Platinum", min: 1500, perk: "Priority concierge support" },
];

function getLoyalty(spend: number) {
  let index = 0;
  for (let i = 0; i < LOYALTY_TIERS.length; i += 1) {
    if (spend >= LOYALTY_TIERS[i].min) index = i;
  }
  const tier = LOYALTY_TIERS[index];
  const nextTier = LOYALTY_TIERS[index + 1];
  const progress = nextTier
    ? Math.min(100, Math.max(0, ((spend - tier.min) / (nextTier.min - tier.min)) * 100))
    : 100;

  return { tier, nextTier, progress };
}

function formatMemberSince(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function AccountDashboard({
  userId,
  displayName,
  email,
  initials,
  signedIn,
  configured,
  memberSince,
  initialAddress,
}: {
  userId: string | null;
  displayName: string;
  email: string | null;
  initials: string;
  signedIn: boolean;
  configured: boolean;
  memberSince: string | null;
  initialAddress: SavedAddress | null;
}) {
  const router = useRouter();
  const { orders, loading } = useOrders(userId, configured, email);
  const { count: bagCount, subtotal: bagSubtotal } = useCart();
  const { ids } = useWishlist();
  const { slugs } = useRecentlyViewed();
  const [prefs, setPrefs, prefsHydrated] = useHydratedJson<NotificationPrefs>(
    PREFS_KEY,
    DEFAULT_PREFS
  );
  const [mounted, setMounted] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const [address, setAddress] = React.useState<SavedAddress>(() =>
    normalizeSavedAddress(initialAddress ?? EMPTY_SAVED_ADDRESS)
  );
  const [addressErrors, setAddressErrors] = React.useState<Record<string, string>>({});
  const [savingAddress, setSavingAddress] = React.useState(false);

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Guests (and signed-in shoppers before they save a profile address) keep
  // delivery details on this device. Read in a frame callback so the initial
  // render stays pure and hydration can't drift.
  React.useEffect(() => {
    if (initialAddress) return;
    const id = requestAnimationFrame(() => {
      // A signed-in profile only trusts the device cache once the device is
      // bound to this account — never another shopper's saved address.
      if (configured && signedIn && userId) {
        const owner = checkoutIdentityForUser(userId);
        if (readCheckoutOwner() !== owner) return;
      }
      const local = readLocalSavedAddress();
      if (local) setAddress(local);
    });
    return () => cancelAnimationFrame(id);
  }, [configured, initialAddress, signedIn, userId]);

  React.useEffect(() => {
    if (!prefsHydrated) return;
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* storage blocked — preferences stay in memory */
    }
  }, [prefs, prefsHydrated]);

  const stats = React.useMemo(() => {
    const paid = orders.filter((order) => order.status !== "cancelled");
    return {
      orders: orders.length,
      active: orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status)).length,
      spend: paid.reduce((sum, order) => sum + order.total, 0),
      units: paid.reduce(
        (sum, order) => sum + order.items.reduce((count, line) => count + line.quantity, 0),
        0
      ),
    };
  }, [orders]);

  const loyalty = React.useMemo(() => getLoyalty(stats.spend), [stats.spend]);

  const recent = React.useMemo(
    () =>
      slugs
        .map((slug) => getProductBySlug(slug))
        .filter((product): product is Product => Boolean(product))
        .slice(0, 4),
    [slugs]
  );

  const memberSinceLabel = formatMemberSince(memberSince);

  const updatePref = React.useCallback(
    (key: keyof NotificationPrefs, checked: boolean) => {
      setPrefs((current) => ({ ...current, [key]: checked }));
    },
    [setPrefs]
  );

  const updateAddress = (key: keyof SavedAddress) => (value: string) => {
    setAddress((current) => ({ ...current, [key]: value }));
    setAddressErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  async function saveAddress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingAddress) return;

    const cleaned = normalizeSavedAddress(address);
    const nextErrors = validateFields(
      ["fullName", "phone", "address", "city", "postalCode"],
      { ...cleaned }
    );
    if (!cleaned.country) nextErrors.country = "Country is required";

    setAddressErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Check your delivery details", {
        description: Object.values(nextErrors)[0],
      });
      return;
    }

    setSavingAddress(true);
    try {
      if (configured && signedIn && userId) {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) throw new Error("Account connection is unavailable.");

        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: cleaned.fullName,
            phone: cleaned.phone,
            address: cleaned.address,
            city: cleaned.city,
            postal_code: cleaned.postalCode,
            country: cleaned.country,
          })
          .eq("id", userId);

        if (error) throw new Error(error.message);

        // Keep a local copy so checkout can prefill instantly, even offline.
        // Reconcile first so a different account's cached identity is removed.
        reconcileCheckoutIdentity(checkoutIdentityForUser(userId));
        writeLocalSavedAddress(cleaned);
        setAddress(cleaned);
        toast.success("Delivery details saved", {
          description: "They’ll be prefilled at checkout on every device.",
        });
        router.refresh();
      } else {
        writeCheckoutOwner(GUEST_IDENTITY);
        const stored = writeLocalSavedAddress(cleaned);
        if (!stored) throw new Error("This browser blocked local storage.");
        setAddress(cleaned);
        toast.success("Delivery details saved", {
          description: "They’ll be prefilled at checkout on this device.",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      const needsMigration = /column|schema cache/i.test(message);
      toast.error("Couldn’t save delivery details", {
        description: needsMigration
          ? "Run the updated supabase/schema.sql to add the profile address columns."
          : message,
      });
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase?.auth.signOut();
      clearCheckoutIdentity();
      toast.success("Signed out");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Couldn’t sign out", { description: "Please try again." });
      setSigningOut(false);
    }
  }

  const statCards = [
    {
      key: "orders",
      icon: Package,
      label: "Orders placed",
      value: loading ? null : String(stats.orders),
      hint: loading
        ? "Loading your history…"
        : stats.orders === 0
          ? "Your first pair awaits"
          : `${stats.units} ${stats.units === 1 ? "item" : "items"} all-time`,
    },
    {
      key: "active",
      icon: Truck,
      label: "In progress",
      value: loading ? null : String(stats.active),
      hint: loading
        ? "Checking fulfilment…"
        : stats.active > 0
          ? "On the move right now"
          : "Everything is delivered",
    },
    {
      key: "spend",
      icon: Wallet,
      label: "Lifetime spend",
      value: loading ? null : formatPrice(stats.spend),
      hint: loading ? "Totalling your orders…" : "Excludes cancelled orders",
    },
    {
      key: "saved",
      icon: Heart,
      label: "Saved styles",
      value: mounted ? String(ids.length) : null,
      hint: mounted
        ? ids.length > 0
          ? "In your wishlist"
          : "Tap a heart to save"
        : "Loading your wishlist…",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-5 pb-20 sm:px-6 sm:pt-8 sm:pb-24 lg:px-8">
      {/* ── Profile hero ─────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden rounded-lg bg-gradient-to-br from-emerald-950 via-neutral-900 to-neutral-950 text-white shadow-lg">
        <span
          aria-hidden
          className="absolute -top-24 -right-16 size-72 rounded-full bg-emerald-400/15 blur-3xl"
        />
        <span
          aria-hidden
          className="absolute -bottom-32 -left-20 size-72 rounded-full bg-white/5 blur-3xl"
        />

        <div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            {/* <Avatar className="size-16 shrink-0 ring-4 ring-white/10 sm:size-20">
              <AvatarFallback className="bg-white/10 font-heading text-xl font-semibold text-white sm:text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar> */}

            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-white/60 uppercase">
                <Sparkles className="size-3" aria-hidden />
                {signedIn ? "Welcome back" : "Members area"}
              </p>
              <h1 className="font-heading mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">
                My account
              </h1>
              <div className="mt-1 min-w-0 text-sm leading-relaxed">
                {signedIn ? (
                  <>
                    <p className="truncate font-medium text-white/80">{displayName.charAt(0).toUpperCase() + displayName.slice(1)}</p>
                    {email && (
                      <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-white/50">
                        <Mail className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{email}</span>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="flex items-center gap-1.5 text-white/60">
                    <Mail className="size-3.5 shrink-0" aria-hidden />
                    Sign in to sync your profile
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80">
                  <span
                    className={`size-1.5 rounded-full ${signedIn ? "bg-emerald-400" : "bg-amber-400"}`}
                    aria-hidden
                  />
                  {signedIn ? "Signed in" : "Guest"}
                </span>
                {signedIn && memberSinceLabel && (
                  <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80">
                    Member since {memberSinceLabel}
                  </span>
                )}
                {!configured && (
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200">
                    Demo mode
                  </span>
                )}
              </div>
            </div>
          </div>

          {signedIn ? (
            <div className="w-full rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur sm:p-5 lg:w-80 xl:w-96">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
                  <Award className="size-3.5" aria-hidden /> Stone Club
                </p>
                <Badge className="rounded-full border border-white/15 bg-white/10 px-2.5 text-white hover:bg-white/10">
                  {loyalty.tier.name}
                </Badge>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <p className="font-heading text-2xl font-semibold tracking-tight">
                  {loading ? "—" : formatPrice(stats.spend)}
                </p>
                <span className="pb-0.5 text-[11px] text-white/50">lifetime</span>
              </div>
              <div className="mt-3">
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-white/15"
                  role="progressbar"
                  aria-label={
                    loyalty.nextTier
                      ? `Progress to ${loyalty.nextTier.name}`
                      : "Top loyalty tier reached"
                  }
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(loyalty.progress)}
                  aria-valuetext={
                    loyalty.nextTier
                      ? `${Math.round(loyalty.progress)} percent to ${loyalty.nextTier.name}`
                      : "Top tier reached"
                  }
                >
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-[width] duration-500 motion-reduce:transition-none"
                    style={{ width: `${loading ? 0 : loyalty.progress}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/60">
                  {loading ? (
                    "Loading your rewards…"
                  ) : loyalty.nextTier ? (
                    <>
                      <span className="font-medium text-white">
                        {formatPrice(loyalty.nextTier.min - stats.spend)}
                      </span>{" "}
                      to {loyalty.nextTier.name} · {loyalty.nextTier.perk}
                    </>
                  ) : (
                    <>Top tier unlocked · {loyalty.tier.perk}</>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur sm:p-5 lg:w-80 xl:w-96">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <LogIn className="size-4" aria-hidden /> Keep everything in sync
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                Sign in to track orders, keep your wishlist across devices and start earning Stone
                Club rewards.
              </p>
              <div className="mt-4 flex flex-col gap-2 min-[420px]:flex-row">
                <Link
                  href="/auth/login?next=/account"
                  className={cn(
                    buttonVariants(),
                    "h-10 flex-1 rounded-full bg-white text-neutral-900 hover:bg-white/90"
                  )}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-10 flex-1 rounded-full border border-white/15 text-white hover:bg-white/10 hover:text-white"
                  )}
                >
                  Create account
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {!configured && (
        <Alert className="mt-4 rounded-2xl border-dashed">
          <Info aria-hidden />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Orders, rewards, delivery details and preferences are saved on this device. Connect
            Supabase (see README) to sync accounts, addresses and order history.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Live overview ────────────────────────────────────── */}
      <section
        aria-label="Account overview"
        className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 lg:grid-cols-4"
      >
        {statCards.map((stat) => (
          <Card key={stat.key} size="sm" className="rounded-lg">
            <CardContent className="flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {stat.label}
                </p>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <stat.icon className="size-4" aria-hidden />
                </span>
              </div>
              {stat.value === null ? (
                <Skeleton className="mt-1.5 h-8 w-20" />
              ) : (
                <p className="font-heading mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {stat.value}
                </p>
              )}
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* ── Saved delivery details ───────────────────────────── */}
      <section aria-labelledby="delivery-details-heading" className="mt-4 sm:mt-5">
        <Card className="rounded-3xl">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle
                  id="delivery-details-heading"
                  className="flex items-center gap-2 text-base"
                >
                  <MapPin className="size-4 text-muted-foreground" aria-hidden /> Delivery details
                </CardTitle>
                <CardDescription>
                  {signedIn && configured
                    ? "Saved to your profile and prefilled at checkout."
                    : "Saved on this device and prefilled at checkout. Sign in to sync across devices."}
                </CardDescription>
              </div>
              <Badge variant="outline" className="rounded-full">
                {signedIn && configured ? "Synced account" : "This device"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={saveAddress}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            >
              <AddressField
                className="lg:col-span-2"
                id="account-fullName"
                label="Full name"
                value={address.fullName}
                onChange={(event) => updateAddress("fullName")(event.target.value)}
                autoComplete="name"
                placeholder="Rachel Woods"
                error={addressErrors.fullName}
              />
              <AddressField
                className="lg:col-span-2"
                id="account-phone"
                type="tel"
                inputMode="tel"
                label="Phone"
                value={address.phone}
                onChange={(event) => updateAddress("phone")(event.target.value)}
                autoComplete="tel"
                placeholder="+1 555 234 5567"
                error={addressErrors.phone}
              />
              <AddressField
                className="sm:col-span-2 lg:col-span-4"
                id="account-address"
                label="Street address"
                value={address.address}
                onChange={(event) => updateAddress("address")(event.target.value)}
                autoComplete="address-line1"
                placeholder="121 Main St, Apartment 4"
                error={addressErrors.address}
              />
              <AddressField
                id="account-city"
                label="City"
                value={address.city}
                onChange={(event) => updateAddress("city")(event.target.value)}
                autoComplete="address-level2"
                placeholder="Brooklyn"
                error={addressErrors.city}
              />
              <AddressField
                id="account-postalCode"
                label="Postal code"
                value={address.postalCode}
                onChange={(event) => updateAddress("postalCode")(event.target.value)}
                autoComplete="postal-code"
                placeholder="11201"
                error={addressErrors.postalCode}
              />
              <AddressField
                className="sm:col-span-2"
                id="account-country"
                label="Country"
                value={address.country}
                onChange={(event) => updateAddress("country")(event.target.value)}
                autoComplete="country-name"
                placeholder="United States"
                error={addressErrors.country}
              />

              <div className="flex flex-col gap-2 border-t pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between lg:col-span-4">
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Truck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  Name, phone and address are prefilled at checkout.
                </p>
                <Button
                  type="submit"
                  disabled={savingAddress}
                  className="w-full rounded-full sm:w-auto"
                >
                  {savingAddress ? (
                    <Loader2 className="animate-spin" aria-hidden />
                  ) : (
                    <Save aria-hidden />
                  )}
                  {savingAddress ? "Saving…" : "Save delivery details"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* ── Orders + account sidebar ─────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-labelledby="order-history-heading" className="min-w-0">
          <OrderHistory orders={orders} loading={loading} />
        </section>

        <aside className="flex min-w-0 flex-col gap-4" aria-label="Account shortcuts">
          <Card size="sm" className="rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base">Quick links</CardTitle>
              <CardDescription>Everything in one place</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-1.5">
              <QuickLink
                href="/wishlist"
                icon={Heart}
                label="My wishlist"
                meta={
                  mounted
                    ? ids.length > 0
                      ? `${ids.length} saved ${ids.length === 1 ? "style" : "styles"}`
                      : "Save your favourites"
                    : "Loading…"
                }
              />
              <QuickLink
                href="/cart"
                icon={ShoppingBag}
                label="My bag"
                meta={
                  mounted
                    ? bagCount > 0
                      ? `${bagCount} ${bagCount === 1 ? "item" : "items"} · ${formatPrice(bagSubtotal)}`
                      : "Your bag is empty"
                    : "Loading…"
                }
              />
              <QuickLink
                href="/products"
                icon={Sparkles}
                label="Shop new arrivals"
                meta="Fresh drops, every week"
              />
              <QuickLink
                href="/admin"
                icon={LayoutDashboard}
                label="Admin dashboard"
                meta="Manage orders and products"
              />

              {signedIn && (
                <>
                  <div className="my-1 h-px bg-border" role="presentation" />
                  <Button
                    variant="ghost"
                    className="h-10 w-full justify-start rounded-xl px-2 text-muted-foreground hover:text-foreground"
                    onClick={() => void handleSignOut()}
                    disabled={signingOut}
                  >
                    {signingOut ? (
                      <Loader2 className="animate-spin" aria-hidden />
                    ) : (
                      <LogOut aria-hidden />
                    )}
                    {signingOut ? "Signing out…" : "Sign out"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card size="sm" className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4 text-muted-foreground" aria-hidden /> Notifications
              </CardTitle>
              <CardDescription>Saved on this device</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {PREF_ROWS.map((row) => (
                <label
                  key={row.key}
                  className="flex cursor-pointer items-start justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{row.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {row.description}
                    </span>
                  </span>
                  <Switch
                    checked={prefs[row.key]}
                    onCheckedChange={(checked) => updatePref(row.key, checked)}
                    className="mt-0.5"
                  />
                </label>
              ))}
            </CardContent>
          </Card>

          <Card size="sm" className="rounded-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Headphones className="size-4 text-muted-foreground" aria-hidden /> Need a hand?
              </CardTitle>
              <CardDescription>Real people, quick answers.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Include your order number and our care team will reply within one business day.
              </p>
              <a
                href="mailto:care@soleandstone.com"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "justify-start rounded-xl bg-background"
                )}
              >
                <Mail aria-hidden /> Email support
              </a>
              <div className="grid grid-cols-2 gap-2 border-t pt-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Truck className="size-3.5" aria-hidden /> Free over $250
                </span>
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="size-3.5" aria-hidden /> 30-day returns
                </span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {recent.length > 0 && (
        <section className="mt-8" aria-labelledby="recently-viewed-heading">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2
                id="recently-viewed-heading"
                className="font-heading text-xl font-semibold tracking-tight sm:text-2xl"
              >
                Pick up where you left off
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Your recently viewed styles.</p>
            </div>
            <Link
              href="/products"
              className="hidden shrink-0 items-center gap-1 text-sm font-medium hover:underline sm:flex"
            >
              Browse all <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recent.map((product) => (
              <Link key={product.id} href={`/products/${product.slug}`} className="group">
                <div className="zoom-container relative aspect-square overflow-hidden rounded-2xl bg-muted">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes="(min-width: 1024px) 20vw, 45vw"
                    className="object-cover"
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {product.brand}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium">{product.name}</p>
                <p className="mt-0.5 text-sm font-semibold">{formatPrice(product.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AddressField({
  id,
  label,
  error,
  className,
  ...props
}: React.ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string;
  className?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-11 sm:h-10"
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  meta,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "h-auto w-full justify-start gap-3 rounded-2xl px-2 py-2 hover:bg-muted"
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block truncate text-xs font-normal text-muted-foreground">{meta}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
    </Link>
  );
}
