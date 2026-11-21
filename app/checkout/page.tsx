"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Lock,
  LocateFixed,
  RotateCcw,
  ShoppingBag,
  Tag,
  Truck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useCart } from "@/components/providers/cart-provider";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import {
  readLocalSavedAddress,
  savedAddressFromProfile,
  type SavedAddress,
} from "@/lib/account/address";
import {
  CHECKOUT_DRAFT_KEY,
  GUEST_IDENTITY,
  LAST_ORDER_COOKIE,
  LOCAL_ORDERS_KEY,
  checkoutIdentityForUser,
  clearCheckoutIdentity,
  reconcileCheckoutIdentity,
  writeCheckoutOwner,
} from "@/lib/checkout/identity";
import { useHydratedJson } from "@/lib/hooks/use-hydrated-json";
import {
  FIELD_VALIDATORS,
  fieldsForStep as fieldsForStepFor,
  validateFields,
} from "@/lib/checkout/validation";
import { PRODUCTS } from "@/lib/data/products";
import { formatPrice } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { CartLine, Order } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = ["Contact", "Shipping", "Payment"] as const;

const PRODUCT_BY_ID = new Map(PRODUCTS.map((product) => [product.id, product]));

const TRUST_ITEMS = [
  { icon: Lock, label: "Secure checkout" },
  { icon: RotateCcw, label: "30-day returns" },
  { icon: BadgeCheck, label: "Authenticity" },
] as const;

const DEFAULT_FORM = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  country: "United States",
  payment: "card",
  cardNumber: "",
  cardExpiry: "",
  cardCvc: "",
};

type FormShape = typeof DEFAULT_FORM;

type AuthStatus = "checking" | "signed-in" | "signed-out" | "demo";

type CheckoutUser = {
  id: string;
  email: string;
  name: string;
};

/** Only these fields are persisted to localStorage — never payment data. */
const DRAFT_SAFE_FIELDS = [
  "fullName",
  "email",
  "phone",
  "address",
  "city",
  "postalCode",
  "country",
] as const;

/** Rough card-network family from the leading digits — display only. */
function cardBrand(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6(011|5)/.test(digits)) return "Discover";
  return "";
}

/** Add business days so the delivery estimate never lands on a weekend. */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return result;
}

type LocateState = "idle" | "locating" | "done" | "error";

type NominatimAddress = {
  road?: string;
  house_number?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  postcode?: string;
  country?: string;
};

type AddressPatch = Partial<Record<"address" | "city" | "postalCode" | "country", string>>;

/** Reverse-geocode a lat/lon via OpenStreetMap Nominatim (no API key). */
async function reverseGeocode(lat: number, lon: number): Promise<AddressPatch> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
    { headers: { "Accept-Language": "en" } }
  );
  if (!res.ok) throw new Error("Nominatim failed");
  const data = (await res.json()) as { address?: NominatimAddress };
  const a = data.address ?? {};
  const patch: AddressPatch = {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  if (street) patch.address = street;
  const city = a.city ?? a.town ?? a.village ?? a.county ?? "";
  if (city) patch.city = city;
  if (a.postcode) patch.postalCode = a.postcode;
  if (a.country) patch.country = a.country;
  return patch;
}

/** IP-based location via ip-api.com — no permission, no key, works everywhere. */
async function ipGeolocate(): Promise<AddressPatch> {
  const res = await fetch(
    "https://ip-api.com/json/?fields=city,zip,country",
    { headers: { "Accept": "application/json" } }
  );
  if (!res.ok) throw new Error("ip-api failed");
  const data = (await res.json()) as {
    status?: string;
    city?: string;
    zip?: string;
    country?: string;
  };
  if (data.status === "fail") throw new Error("ip-api returned fail");
  const patch: AddressPatch = {};
  if (data.city) patch.city = data.city;
  if (data.zip) patch.postalCode = data.zip;
  if (data.country) patch.country = data.country;
  return patch;
}

/**
 * Two-tier location detection:
 * 1. Browser GPS → Nominatim reverse geocode (precise, needs permission)
 * 2. IP geolocation fallback via ip-api.com (city/country/zip, no permission)
 *
 * The fallback fires automatically on any GPS failure — denied, timeout, or
 * unsupported — so "Use my location" always produces something useful.
 */
function useLocateMe(onFill: (patch: AddressPatch) => void) {
  const [state, setState] = React.useState<LocateState>("idle");

  const locate = React.useCallback(async () => {
    setState("locating");

    // ── Tier 1: GPS + reverse geocoding ─────────────────────────
    if (navigator.geolocation) {
      try {
        const permission = await navigator.permissions
          .query({ name: "geolocation" })
          .catch(() => null);

        // Only attempt GPS when permission isn't already denied — avoids a
        // 10-second timeout on browsers that silently block without prompting.
        if (!permission || permission.state !== "denied") {
          const position = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false, // faster, less battery
              timeout: 6_000,
              maximumAge: 60_000,
            })
          );
          const { latitude, longitude } = position.coords;
          const patch = await reverseGeocode(latitude, longitude);

          if (Object.keys(patch).length > 0) {
            onFill(patch);
            setState("done");
            toast.success("Location detected", {
              description: "Review the fields and adjust if needed.",
            });
            return;
          }
        }
      } catch {
        // GPS denied / timed out / geocoding failed → fall through to IP
      }
    }

    // ── Tier 2: IP geolocation (no permission needed) ────────────
    try {
      const patch = await ipGeolocate();

      if (Object.keys(patch).length > 0) {
        onFill(patch);
        setState("done");
        toast.success("Location detected via network", {
          description: "City and country filled. Street address still needs to be entered.",
        });
        return;
      }

      throw new Error("Empty IP result");
    } catch {
      setState("error");
      toast.error("Could not detect location", {
        description: "Enter your address manually.",
      });
    }
  }, [onFill]);

  return { state, locate };
}

/** Input sizing: roomier on touch screens, compact from sm up. */
const INPUT_CLS = "h-11 sm:h-10";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, clear, freeShippingThreshold: threshold } = useCart();
  const { settings } = useSiteSettings();
  const vacation = settings.vacation;
  const freeShipping = subtotal >= threshold;
  const shipping = freeShipping || subtotal === 0 ? 0 : 9.9;
  const total = subtotal + shipping;
  const itemCount = lines.reduce((n, line) => n + line.quantity, 0);

  const savings = React.useMemo(
    () =>
      lines.reduce((sum, line) => {
        const compareAt = PRODUCT_BY_ID.get(line.productId)?.compareAtPrice;
        return compareAt && compareAt > line.price
          ? sum + (compareAt - line.price) * line.quantity
          : sum;
      }, 0),
    [lines]
  );

  // Built after mount so the server render and the client render always agree.
  // The frame callback keeps this out of the synchronous effect body.
  const [deliveryWindow, setDeliveryWindow] = React.useState<string | null>(null);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      const format = (date: Date) =>
        date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const today = new Date();
      setDeliveryWindow(
        `${format(addBusinessDays(today, 2))} – ${format(addBusinessDays(today, 4))}`
      );
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const liveAuth = isSupabaseConfigured();
  const [authStatus, setAuthStatus] = React.useState<AuthStatus>(() =>
    liveAuth ? "checking" : "demo"
  );
  const [authUser, setAuthUser] = React.useState<CheckoutUser | null>(null);
  const [identityReady, setIdentityReady] = React.useState(false);
  const activeUserIdRef = React.useRef<string | null>(null);

  // Draft persists contact/shipping across reloads (in-memory form keeps
  // everything; the storage layer strips payment fields — see effect below).
  const [draft, setDraft, hydrated] = useHydratedJson<Record<string, string>>(
    CHECKOUT_DRAFT_KEY,
    {}
  );
  const form = React.useMemo<FormShape>(() => ({ ...DEFAULT_FORM, ...draft }), [draft]);
  const [prefillSource, setPrefillSource] = React.useState<"account" | "device" | null>(null);

  // Resolve the live account before any local checkout identity is read. A
  // signed-out shopper is sent to sign in first, so a previous user's name,
  // phone and address can never appear in the form.
  React.useEffect(() => {
    if (!liveAuth) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let active = true;

    const applyUser = (
      user: {
        id: string;
        email?: string | null;
        user_metadata?: Record<string, unknown>;
      } | null
    ) => {
      if (!active) return;

      if (!user) {
        if (activeUserIdRef.current) {
          setDraft({});
          setPrefillSource(null);
        }
        activeUserIdRef.current = null;
        clearCheckoutIdentity();
        setAuthUser(null);
        setIdentityReady(false);
        setAuthStatus("signed-out");
        return;
      }

      const previousId = activeUserIdRef.current;
      if (previousId && previousId !== user.id) {
        // Account switched in this tab — drop the rendered draft immediately
        // before the new account's data is loaded.
        setDraft({});
        setPrefillSource(null);
      }
      if (previousId !== user.id) {
        activeUserIdRef.current = user.id;
        setIdentityReady(false);
      }

      setAuthUser({
        id: user.id,
        email: user.email ?? "",
        name:
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          user.email?.split("@")[0] ||
          "",
      });
      setAuthStatus("signed-in");
    };

    void supabase.auth
      .getUser()
      .then(({ data }) => applyUser(data.user ?? null))
      .catch(() => applyUser(null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        applyUser(null);
        return;
      }
      applyUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [liveAuth, setDraft]);

  // Wipe local checkout data from a different account, then mark the current
  // identity as ready. In demo mode the device-local guest data is kept.
  React.useEffect(() => {
    if (!hydrated) return;
    if (authStatus === "checking" || authStatus === "signed-out") return;
    if (authStatus === "signed-in" && !authUser) return;

    const frame = requestAnimationFrame(() => {
      if (authStatus === "demo") {
        writeCheckoutOwner(GUEST_IDENTITY);
        setIdentityReady(true);
        return;
      }

      const cleared = reconcileCheckoutIdentity(checkoutIdentityForUser(authUser!.id));
      if (cleared) {
        setDraft({});
        setPrefillSource(null);
      }
      setIdentityReady(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [authStatus, authUser, hydrated, setDraft]);

  // Server-side proxy handles this too; this keeps client-side navigations
  // and expired sessions from ever showing the checkout form.
  React.useEffect(() => {
    if (authStatus !== "signed-out") return;
    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/auth/login?next=${encodeURIComponent(next)}`);
  }, [authStatus, router]);

  // Prefill contact + saved delivery details once the account is known. Only
  // empty draft fields are filled, so anything the shopper already typed stays.
  const prefillAppliedFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!hydrated || !identityReady) return;
    if (authStatus === "checking" || authStatus === "signed-out") return;

    const ownerKey = authStatus === "demo" ? GUEST_IDENTITY : authUser?.id;
    if (!ownerKey || prefillAppliedFor.current === ownerKey) return;
    prefillAppliedFor.current = ownerKey;

    async function applyPrefill() {
      const authName = authUser?.name ?? "";
      const authEmail = authUser?.email ?? "";
      let profileAddress: SavedAddress | null = null;

      // 1. Signed-in account — email, display name and saved profile address
      if (authStatus === "signed-in" && authUser) {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", authUser.id)
              .maybeSingle();
            profileAddress = savedAddressFromProfile(profile);
          } catch {
            /* ignore — the device copy below can still help */
          }
        }
      }

      // 2. Address saved from the account page. Sign-out/account switching
      //    clears this cache, so it only belongs to the current identity.
      const localAddress = readLocalSavedAddress();

      // 3. Last-used shipping address — only from an order placed with the
      //    signed-in account's email. Guest/device orders never prefill.
      let lastAddress: Partial<SavedAddress> = {};
      const normalizedEmail = authEmail.trim().toLowerCase();
      if (normalizedEmail) {
        try {
          const raw = window.localStorage.getItem(LOCAL_ORDERS_KEY);
          if (raw) {
            const list: unknown = JSON.parse(raw);
            if (Array.isArray(list)) {
              const latest = (list as Order[]).find(
                (order) =>
                  order?.customer?.email?.trim().toLowerCase() === normalizedEmail
              );
              const c = latest?.customer;
              if (c) {
                lastAddress = {
                  fullName: c.fullName || "",
                  phone: c.phone || "",
                  address: c.address || "",
                  city: c.city || "",
                  postalCode: c.postalCode || "",
                  country: c.country || "",
                };
              }
            }
          }
        } catch {
          /* ignore */
        }
      }

      // Profile values win, then the account-page device copy, then the last
      // order. Each field is picked independently so partial data still helps.
      const sources = [profileAddress, localAddress, lastAddress];
      const pick = (field: keyof SavedAddress) => {
        for (const source of sources) {
          const value = source?.[field]?.trim();
          if (value) return value;
        }
        return "";
      };

      const prefillName = pick("fullName") || authName;
      const prefillPhone = pick("phone");
      const prefillAddress = pick("address");
      const prefillCity = pick("city");
      const prefillPostalCode = pick("postalCode");
      const prefillCountry = pick("country");

      if (profileAddress || localAddress) {
        setPrefillSource(profileAddress ? "account" : "device");
      }

      // Only fill fields that are still empty in the current draft
      setDraft((current) => {
        const patch: Record<string, string> = {};
        if (!current.fullName && prefillName) patch.fullName = prefillName;
        if (!current.email && authEmail) patch.email = authEmail;
        if (!current.phone && prefillPhone) patch.phone = prefillPhone;
        if (!current.address && prefillAddress) patch.address = prefillAddress;
        if (!current.city && prefillCity) patch.city = prefillCity;
        if (!current.postalCode && prefillPostalCode) patch.postalCode = prefillPostalCode;
        if (!current.country && prefillCountry) patch.country = prefillCountry;
        // Don't trigger a re-render if nothing changed
        return Object.keys(patch).length > 0 ? { ...current, ...patch } : current;
      });
    }

    void applyPrefill();
  }, [authStatus, authUser, hydrated, identityReady, setDraft]);

  const [step, setStep] = React.useState(0);
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const { state: locateState, locate } = useLocateMe(
    React.useCallback(
      (patch) => {
        setDraft((current) => ({ ...current, ...patch }));
        setErrors((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(patch)) delete next[key];
          return next;
        });
      },
      [setDraft]
    )
  );

  // On phones the on-screen keyboard covers the bottom of the screen, and a
  // fixed bar is anchored to the *layout* viewport — so the action bar would
  // vanish behind the keyboard exactly when the user types card details.
  // Lift it by the keyboard height (direct style writes, no re-render).
  const actionBarRef = React.useRef<HTMLDivElement>(null);
  const wizardRef = React.useRef<HTMLDivElement>(null);
  const prevStepRef = React.useRef(step);

  // A wizard must re-anchor on every step change — otherwise you keep the
  // old scroll offset and land mid-form (or on the summary card) on a phone.
  React.useEffect(() => {
    if (prevStepRef.current === step) return;
    prevStepRef.current = step;
    wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  React.useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const sync = () => {
      const el = actionBarRef.current;
      if (!el) return;
      const overlap = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop
      );
      el.style.transform = overlap > 0 ? `translateY(-${Math.round(overlap)}px)` : "";
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, []);

  const set = (key: keyof FormShape) => (value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // Live correction: if this field already showed an error, re-check instantly
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const msg = FIELD_VALIDATORS[key]?.(value);
      if (msg) return { ...prev, [key]: msg };
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const blurField = (key: string) => {
    const validator = FIELD_VALIDATORS[key];
    if (!validator) return;
    const value = (form as Record<string, string>)[key] ?? "";
    setErrors((prev) => {
      const msg = validator(value);
      if (msg) return { ...prev, [key]: msg };
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Persist the draft using an explicit allowlist — card details are
  // structurally incapable of reaching storage (state keeps them). Nothing is
  // written until the checkout identity has been reconciled.
  React.useEffect(() => {
    if (!hydrated || !identityReady) return;
    try {
      const safe: Record<string, string> = {};
      for (const key of DRAFT_SAFE_FIELDS) {
        const value = draft[key];
        if (value) safe[key] = value;
      }
      window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(safe));
    } catch {
      /* ignore storage errors */
    }
  }, [draft, hydrated, identityReady]);

  /**
   * Which fields a step requires. Cash on delivery needs no card details —
   * validating them anyway made "Place order" fail silently (the card inputs
   * aren't rendered, so the error was never visible).
   */
  function fieldsForStep(current: number): string[] {
    return fieldsForStepFor(current, form.payment);
  }

  function validateStep(current: number): boolean {
    const e = validateFields(fieldsForStep(current), form as Record<string, string>);
    setErrors(e);
    const valid = Object.keys(e).length === 0;
    if (!valid) revealFirstError(current, e);
    return valid;
  }

  /**
   * Mobile win: the invalid field is often below the fold on a phone, so the
   * error message alone isn't enough — bring the field into view and focus it.
   */
  function revealFirstError(current: number, found: Record<string, string>) {
    const first = fieldsForStep(current).find((field) => found[field]);
    const el = first ? document.getElementById(first) : null;
    if (!el) {
      // Safety net: a wizard must never fail silently — always tell the user.
      toast.error("Check your details", {
        description: "Some required fields are still missing.",
      });
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
  }

  function next() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  /** Switching method clears any stale card errors (they may not even be on
      screen any more, and an invisible error blocks the order). */
  function selectPayment(value: string) {
    set("payment")(value);
    setErrors((prev) => {
      if (!("cardNumber" in prev) && !("cardExpiry" in prev) && !("cardCvc" in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next.cardNumber;
      delete next.cardExpiry;
      delete next.cardCvc;
      return next;
    });
  }

  async function placeOrder() {
    if (!validateStep(2)) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines,
          subtotal,
          shipping,
          total,
          customer: {
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            address: form.address,
            city: form.city,
            postalCode: form.postalCode,
            country: form.country,
          },
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Order failed");
      const orderId = data.id ?? `DM-${Date.now().toString().slice(-6)}`;

      // Persist a copy locally so the account page shows it even in demo mode.
      try {
        const orderObj = {
          id: orderId,
          createdAt: new Date().toISOString(),
          status: "pending",
          items: lines,
          subtotal,
          shipping,
          total,
          customer: {
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            address: form.address,
            city: form.city,
            postalCode: form.postalCode,
            country: form.country,
          },
        };
        const raw = window.localStorage.getItem(LOCAL_ORDERS_KEY);
        const list: unknown[] = raw ? JSON.parse(raw) : [];
        window.localStorage.setItem(
          LOCAL_ORDERS_KEY,
          JSON.stringify([orderObj, ...list].slice(0, 25))
        );
        document.cookie = `${LAST_ORDER_COOKIE}=${encodeURIComponent(
          JSON.stringify({ id: orderId, total })
        )}; path=/; max-age=3600; SameSite=Lax`;
      } catch {
        /* ignore storage errors */
      }

      clear();
      setDraft({}); // order placed — drop the saved draft
      router.push(`/checkout/success?order=${encodeURIComponent(orderId)}&total=${total}`);
    } catch (err) {
      toast.error("Checkout failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const authBlocked =
    authStatus === "checking" || authStatus === "signed-out" || !identityReady;

  if (authBlocked) {
    const label =
      authStatus === "signed-out"
        ? "Redirecting you to sign in…"
        : authStatus === "checking"
          ? "Checking your account…"
          : "Preparing checkout…";

    return (
      <div
        role="status"
        aria-live="polite"
        className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center"
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-muted">
          {authStatus === "signed-out" ? (
            <Lock className="size-6 text-muted-foreground" aria-hidden />
          ) : (
            <Spinner className="size-6 text-muted-foreground" />
          )}
        </span>
        <p className="font-heading mt-5 text-xl font-semibold">{label}</p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          {authStatus === "signed-out"
            ? "Checkout needs a signed-in account so saved delivery details stay private."
            : "Please wait a moment — we’re securing your checkout."}
        </p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted sm:size-20">
          <ShoppingBag className="size-7 text-muted-foreground sm:size-8" aria-hidden />
        </span>
        <h1 className="font-heading mt-5 max-w-xs text-2xl font-semibold text-balance sm:mt-6 sm:text-3xl">
          Nothing to check out yet
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Your bag is empty — add a pair of kicks first.
        </p>
        <Button
          size="lg"
          className="mt-6 w-full max-w-xs rounded-full"
          render={<Link href="/products" />}
        >
          Browse shoes <ArrowRight aria-hidden />
        </Button>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="size-3.5" aria-hidden />
          Free express shipping over {formatPrice(threshold)}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-44 sm:px-6 sm:pt-6 lg:px-8 lg:pb-24">
      <header className="mb-4 flex items-center justify-between gap-3 sm:mb-8 sm:gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Secure checkout
          </p>
          <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Checkout
          </h1>
        </div>
        <Badge variant="outline" className="shrink-0 gap-1.5 rounded-full py-1.5">
          <Lock className="size-3" aria-hidden /> SSL encrypted
        </Badge>
      </header>

      {vacation.enabled && (
        <Alert className="mb-4 border-amber-500/30 bg-amber-500/10 text-amber-900 sm:mb-6 [&>svg]:text-amber-600">
          <CalendarClock aria-hidden />
          <AlertTitle>Holiday delivery update</AlertTitle>
          <AlertDescription className="text-amber-800/90">
            {vacation.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        {/* ── Steps column ── */}
        <div ref={wizardRef} className="min-w-0 scroll-mt-20">
          {/* Announces the current step to assistive tech */}
          <p className="sr-only" aria-live="polite">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
          {/* Stepper — compact circles + labels. Below 380px only the current
              step keeps its label so three long words can never force the
              layout wider than the viewport. */}
          <ol
            className="mb-4 flex items-center gap-1 sm:mb-8 sm:gap-2"
            aria-label="Checkout progress"
          >
            {STEPS.map((label, i) => (
              <li
                key={label}
                className="flex min-w-0 flex-1 items-center gap-1 last:flex-none sm:gap-2"
              >
                {/* Circle + label act as one tap target — a 28px dot was
                    impossible to hit accurately on a phone */}
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full py-1 pr-0.5 text-left transition-opacity sm:gap-2 sm:pr-1",
                    i > step ? "opacity-70" : "cursor-pointer"
                  )}
                  aria-current={i === step ? "step" : undefined}
                  aria-label={`Step ${i + 1}: ${label}`}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      i === step
                        ? "bg-foreground text-background"
                        : i < step
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i < step ? <CheckCircle2 className="size-4" aria-hidden /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-medium whitespace-nowrap sm:text-xs",
                      i === step
                        ? "inline text-foreground"
                        : "hidden text-muted-foreground min-[380px]:inline"
                    )}
                  >
                    {label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span
                    className={cn("h-px flex-1", i < step ? "bg-emerald-600" : "bg-border")}
                    aria-hidden
                  />
                )}
              </li>
            ))}
          </ol>

          {/* Completed-step recap with quick edit — appears from step 1 on */}
          {step >= 1 && (
            <div className="mb-3 grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-xl border bg-card px-2.5 py-1.5 text-left transition-colors hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3 sm:py-2"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 sm:size-7">
                  <User className="size-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Contact
                  </span>
                  <span className="block truncate text-xs font-medium">
                    {form.fullName || form.email || "—"}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground underline underline-offset-2">
                  Edit
                </span>
              </button>
              {step >= 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex min-h-11 w-full min-w-0 items-center gap-2.5 rounded-xl border bg-card px-2.5 py-1.5 text-left transition-colors hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:px-3 sm:py-2"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 sm:size-7">
                    <Truck className="size-3.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Ships to
                    </span>
                    <span className="block truncate text-xs font-medium">
                      {[form.address, form.city, form.postalCode].filter(Boolean).join(", ") || "—"}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground underline underline-offset-2">
                    Edit
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Mobile order summary — an accordion near the top keeps the running
              total close at hand without pushing the form off screen. */}
          <details className="group mb-3 overflow-hidden rounded-2xl border bg-card lg:hidden">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <ShoppingBag className="size-4 text-muted-foreground" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">Order summary</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
                  {freeShipping ? "Free shipping" : `${formatPrice(shipping)} shipping`}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="font-heading block text-base leading-tight font-semibold">
                  {formatPrice(total)}
                </span>
                <span className="flex items-center justify-end gap-0.5 text-[11px] text-muted-foreground">
                  <span className="group-open:hidden">View</span>
                  <span className="hidden group-open:inline">Hide</span>
                  <ChevronDown
                    className="size-3.5 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden
                  />
                </span>
              </span>
            </summary>
            <div className="border-t px-3.5 pt-3.5 pb-4">
              <OrderSummaryBody
                compact
                lines={lines}
                subtotal={subtotal}
                shipping={shipping}
                total={total}
                freeShipping={freeShipping}
                savings={savings}
                threshold={threshold}
                deliveryWindow={deliveryWindow}
              />
              <p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground">
                By placing the order you agree to the demo Terms. Your data stays on this device
                unless Supabase is connected.
              </p>
            </div>
          </details>

          {/* Step 0 — Contact */}
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2 text-lg">
                  <User className="size-4" aria-hidden /> Contact details
                </CardTitle>
                <CardDescription>
                  We use these for order updates. Saved on this device as you type.
                  {prefillSource && (
                    <span className="mt-1 flex items-center gap-1 text-emerald-600">
                      <BadgeCheck className="size-3.5 shrink-0" aria-hidden />
                      {prefillSource === "account"
                        ? "Prefilled from your account"
                        : "Prefilled from this device"}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2" label="Full name" id="fullName" error={errors.fullName}>
                  <Input id="fullName" className={INPUT_CLS} value={form.fullName} onChange={(e) => set("fullName")(e.target.value)} onBlur={() => blurField("fullName")} placeholder="Rachel Woods" autoComplete="name" />
                </Field>
                <Field label="Email" id="email" error={errors.email}>
                  <Input id="email" type="email" inputMode="email" className={INPUT_CLS} value={form.email} onChange={(e) => set("email")(e.target.value)} onBlur={() => blurField("email")} placeholder="you@example.com" autoComplete="email" />
                </Field>
                <Field label="Phone" id="phone" error={errors.phone}>
                  <Input id="phone" type="tel" inputMode="tel" className={INPUT_CLS} value={form.phone} onChange={(e) => set("phone")(e.target.value)} onBlur={() => blurField("phone")} placeholder="+1 555 234 5567" autoComplete="tel" />
                </Field>
              </CardContent>
            </Card>
          )}

          {/* Step 1 — Shipping */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="font-heading flex items-center gap-2 text-lg">
                      <Truck className="size-4" aria-hidden /> Shipping address
                    </CardTitle>
                    <CardDescription>
                      {deliveryWindow ? `Delivery estimate: ${deliveryWindow}.` : "Delivery in 2–4 business days."}
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 rounded-full"
                    onClick={() => void locate()}
                    disabled={locateState === "locating"}
                    title="Fill address fields from your current location"
                  >
                    {locateState === "locating" ? (
                      <Spinner className="size-3.5" aria-hidden />
                    ) : (
                      <LocateFixed className="size-3.5" aria-hidden />
                    )}
                    {locateState === "locating" ? "Detecting…" : "Use my location"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2" label="Street address" id="address" error={errors.address}>
                  <Input id="address" className={INPUT_CLS} value={form.address} onChange={(e) => set("address")(e.target.value)} onBlur={() => blurField("address")} placeholder="121 Main St, Apartment 4" autoComplete="address-line1" />
                </Field>
                <Field label="City" id="city" error={errors.city}>
                  <Input id="city" className={INPUT_CLS} value={form.city} onChange={(e) => set("city")(e.target.value)} onBlur={() => blurField("city")} placeholder="Brooklyn" autoComplete="address-level2" />
                </Field>
                <Field label="Postal code" id="postalCode" error={errors.postalCode}>
                  <Input id="postalCode" inputMode="numeric" className={INPUT_CLS} value={form.postalCode} onChange={(e) => set("postalCode")(e.target.value)} onBlur={() => blurField("postalCode")} placeholder="11201" autoComplete="postal-code" />
                </Field>
                <Field className="sm:col-span-2" label="Country" id="country">
                  <Input id="country" className={INPUT_CLS} value={form.country} onChange={(e) => set("country")(e.target.value)} autoComplete="country-name" />
                </Field>
              </CardContent>
            </Card>
          )}

          {/* Step 2 — Payment */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2 text-lg">
                  <CreditCard className="size-4" aria-hidden /> Payment
                </CardTitle>
                <CardDescription>
                  <span className="sm:hidden">
                    Demo mode — no real charge happens on this device.
                  </span>
                  <span className="hidden sm:inline">
                    Demo environment — no real charge happens. Digital wallets are wired for the
                    Supabase deployment.
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <RadioGroup
                  value={form.payment}
                  onValueChange={(v: string) => selectPayment(v)}
                  aria-label="Payment method"
                >
                  {/* The whole row is the tap target — tapping the label text
                      selects the option on a phone, not just the 20px dot. */}
                  <label
                    onClick={() => selectPayment("card")}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-sm transition-colors sm:p-4",
                      form.payment === "card"
                        ? "border-foreground bg-muted/60"
                        : "hover:border-foreground/30 hover:bg-muted/40"
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background ring-1 ring-foreground/10">
                      <CreditCard className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">Credit or debit card</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        Visa, Mastercard, Amex
                        <span className="hidden min-[380px]:inline">
                          {" "}
                          · instant confirmation
                        </span>
                      </span>
                    </span>
                    <RadioGroupItem value="card" className="mt-2 size-5" />
                  </label>
                  <label
                    onClick={() => selectPayment("cod")}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 text-sm transition-colors sm:p-4",
                      form.payment === "cod"
                        ? "border-foreground bg-muted/60"
                        : "hover:border-foreground/30 hover:bg-muted/40"
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-background ring-1 ring-foreground/10">
                      <Banknote className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">Cash on delivery</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        Pay when your order arrives
                        <span className="hidden min-[380px]:inline"> · no card needed</span>
                      </span>
                    </span>
                    <RadioGroupItem value="cod" className="mt-2 size-5" />
                  </label>
                </RadioGroup>

                {form.payment === "card" && (
                  <>
                    {/* Two-up on mobile too — expiry/CVC side by side halves the
                        scrolling and matches how wallet autofill expects them. */}
                    <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                      <Field
                        className="col-span-2"
                        label="Card number"
                        id="cardNumber"
                        error={errors.cardNumber}
                        extra={
                          cardBrand(form.cardNumber) && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wider text-foreground uppercase">
                              {cardBrand(form.cardNumber)}
                            </span>
                          )
                        }
                      >
                        <Input
                          id="cardNumber"
                          name="cardnumber"
                          autoComplete="cc-number"
                          inputMode="numeric"
                          className={INPUT_CLS}
                          placeholder="4242 4242 4242 4242"
                          value={form.cardNumber}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                            set("cardNumber")(v.replace(/(\d{4})(?=\d)/g, "$1 "));
                          }}
                          onBlur={() => blurField("cardNumber")}
                        />
                      </Field>
                      <Field label="Expiry (MM/YY)" id="cardExpiry" error={errors.cardExpiry}>
                        <Input
                          id="cardExpiry"
                          name="cc-exp"
                          autoComplete="cc-exp"
                          inputMode="numeric"
                          className={INPUT_CLS}
                          placeholder="12/29"
                          value={form.cardExpiry}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                            set("cardExpiry")(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                          }}
                          onBlur={() => blurField("cardExpiry")}
                        />
                      </Field>
                      <Field label="CVC" id="cardCvc" error={errors.cardCvc}>
                        <Input
                          id="cardCvc"
                          name="cvc"
                          autoComplete="cc-csc"
                          inputMode="numeric"
                          className={INPUT_CLS}
                          placeholder="123"
                          value={form.cardCvc}
                          onChange={(e) => set("cardCvc")(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          onBlur={() => blurField("cardCvc")}
                        />
                      </Field>
                    </div>
                    <p className="flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                      <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      Card details are never saved on this device. This demo checkout does not send
                      card data anywhere.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Nav buttons — inline on desktop, in the sticky bar on mobile */}
          <div className="mt-6 hidden items-center justify-between gap-3 lg:flex">
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => (step === 0 ? history.back() : setStep((s) => s - 1))}
            >
              <ArrowLeft aria-hidden /> {step === 0 ? "Back to bag" : STEPS[step - 1]}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button size="lg" className="rounded-full" onClick={next}>
                Continue to {STEPS[step + 1]} <ArrowRight aria-hidden />
              </Button>
            ) : (
              <Button
                size="lg"
                className="rounded-full"
                onClick={placeOrder}
                disabled={submitting}
              >
                {submitting ? <Spinner className="size-4" aria-hidden /> : <Lock aria-hidden />}
                {submitting ? "Placing order…" : `Place order · ${formatPrice(total)}`}
              </Button>
            )}
          </div>
        </div>

        {/* ── Summary column (desktop) ── */}
        <div className="hidden min-w-0 lg:sticky lg:top-24 lg:block lg:self-start">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="font-heading text-lg">Order summary</CardTitle>
                <Badge variant="secondary" className="rounded-full">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </Badge>
              </div>
              <CardDescription>Delivery and total are confirmed before you pay.</CardDescription>
            </CardHeader>
            <CardContent>
              <OrderSummaryBody
                lines={lines}
                subtotal={subtotal}
                shipping={shipping}
                total={total}
                freeShipping={freeShipping}
                savings={savings}
                threshold={threshold}
                deliveryWindow={deliveryWindow}
              />
            </CardContent>
          </Card>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            By placing the order you agree to the demo Terms. Your data stays on your device unless
            Supabase is connected.
          </p>
        </div>
      </div>

      {/* Sticky mobile action bar — tab bar is hidden on /checkout.
          The running total and step progress stay on screen at every step. */}
      <div
        ref={actionBarRef}
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl transition-transform duration-150 lg:hidden"
      >
        <div className="flex gap-1 px-4 pt-2" aria-hidden>
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                i <= step ? "bg-emerald-500" : "bg-muted"
              )}
            />
          ))}
        </div>
        <div className="mx-auto flex max-w-7xl items-center gap-2.5 px-4 pt-1.5 pb-3 sm:gap-3 sm:px-6">
          <Button
            variant="outline"
            aria-label={step === 0 ? "Back to bag" : `Back to ${STEPS[step - 1]}`}
            className="size-11 shrink-0 rounded-full px-0"
            onClick={() => (step === 0 ? router.push("/cart") : setStep((s) => s - 1))}
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Step {step + 1} of {STEPS.length}
            </p>
            <p className="font-heading truncate text-lg leading-tight font-semibold">
              {formatPrice(total)}
            </p>
          </div>
          {step < STEPS.length - 1 ? (
            <Button
              size="lg"
              className="h-11 shrink-0 justify-center rounded-full px-4 sm:px-5"
              onClick={next}
            >
              <span className="sm:hidden">Continue</span>
              <span className="hidden sm:inline">Continue to {STEPS[step + 1]}</span>
              <ArrowRight aria-hidden />
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-11 shrink-0 justify-center rounded-full px-4 sm:px-5"
              onClick={placeOrder}
              disabled={submitting}
            >
              {submitting ? <Spinner className="size-4" aria-hidden /> : <Lock aria-hidden />}
              {submitting ? "Placing…" : "Place order"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Shared order summary body — mobile accordion and desktop sticky card. */
function OrderSummaryBody({
  lines,
  subtotal,
  shipping,
  total,
  freeShipping,
  savings,
  threshold,
  deliveryWindow,
  compact = false,
}: {
  lines: CartLine[];
  subtotal: number;
  shipping: number;
  total: number;
  freeShipping: boolean;
  savings: number;
  threshold: number;
  deliveryWindow: string | null;
  compact?: boolean;
}) {
  const progress = Math.min(100, Math.round((subtotal / threshold) * 100));
  const remaining = Math.max(0, threshold - subtotal);

  return (
    <div className="min-w-0">
      {/* No nested scrolling on mobile — the list just flows */}
      <ul
        className={cn(
          "flex flex-col gap-3",
          !compact && "pb-4 sm:max-h-72 sm:overflow-y-auto"
        )}
      >
        {lines.map((line) => (
          <li key={line.key} className="flex items-center gap-3 mb-3">
            <Link
              href={`/products/${line.slug}`}
              className="zoom-container relative size-12 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-14"
            >
              {/* Explicit dimensions instead of `fill` — the mobile accordion
                  is display:none while closed, which makes a fill image
                  measure a zero-height parent. */}
              <Image
                src={line.image}
                alt={line.name}
                width={56}
                height={56}
                sizes={compact ? "48px" : "(max-width: 640px) 48px, 56px"}
                className="size-full object-cover"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {line.brand}
              </p>
              <p className="line-clamp-2 text-sm leading-snug font-medium">{line.name}</p>
              <p className="text-xs text-muted-foreground">
                Size {line.size} · Qty {line.quantity}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold whitespace-nowrap">
              {formatPrice(line.price * line.quantity)}
            </p>
          </li>
        ))}
      </ul>
      <Separator />
      <div className="mt-3 flex flex-col gap-2 text-sm mt-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Shipping</span>
          <span className={freeShipping ? "font-medium text-emerald-600" : ""}>
            {freeShipping ? "FREE" : formatPrice(shipping)}
          </span>
        </div>
        {savings > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span className="flex items-center gap-1.5">
              <Tag className="size-3.5" aria-hidden /> You save
            </span>
            <span className="font-medium">−{formatPrice(savings)}</span>
          </div>
        )}
        <Separator className="my-1" />
        <div className="flex items-baseline justify-between font-semibold">
          <span>Total</span>
          <span className="font-heading text-xl">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Free shipping progress */}
      <div
        className={cn(
          "mt-3 rounded-xl border p-2.5",
          freeShipping ? "border-emerald-600/20 bg-emerald-500/5" : "bg-muted/40"
        )}
      >
        <div className="flex items-center gap-2">
          {freeShipping ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
          ) : (
            <Truck className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <p
            className={cn(
              "text-xs",
              freeShipping ? "font-medium text-emerald-700" : "text-muted-foreground"
            )}
          >
            {freeShipping ? (
              "Free express shipping unlocked"
            ) : (
              <>
                Add{" "}
                <strong className="font-semibold text-foreground">
                  {formatPrice(remaining)}
                </strong>{" "}
                for free shipping
              </>
            )}
          </p>
        </div>
        {!freeShipping && (
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress to free shipping"
          >
            <span
              className="block h-full rounded-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-muted/60 p-3">
        <Truck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0">
          <p className="text-xs font-medium">
            {deliveryWindow ? `Arrives ${deliveryWindow}` : "Arrives in 2–4 business days"}
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Tracked delivery · Free over {formatPrice(threshold)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3">
        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 text-center">
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-[10px] leading-tight text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  error,
  extra,
  children,
  className,
}: {
  label: string;
  id: string;
  error?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const errorId = `${id}-error`;

  // Wire the control to its error message without repeating aria attributes
  // at every call site. Every field currently renders a single <Input>.
  let control = children;
  if (React.isValidElement(children)) {
    control = React.cloneElement(
      children as React.ReactElement<{
        id?: string;
        "aria-invalid"?: boolean;
        "aria-describedby"?: string;
      }>,
      {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      }
    );
  }

  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {extra}
      </div>
      {control}
      {error && (
        <p id={errorId} className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
