"use client";

import * as React from "react";
import {
  CalendarClock,
  Gift,
  ImageIcon,
  Loader2,
  LockKeyhole,
  Megaphone,
  RotateCcw,
  Save,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  DEFAULT_SITE_SETTINGS,
  normalizeSiteSettings,
  settingsToRow,
  splitHighlight,
  type SiteBannerSettings,
  type SiteHeroSettings,
  type SiteSettings,
  type SiteVacationSettings,
  type SiteWelcomePopupSettings,
} from "@/lib/site-settings";
import type { AdminProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

type StorefrontSettingsPanelProps = {
  products: AdminProduct[];
  canManage: boolean;
};

const CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "ETB", name: "Ethiopian Birr" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "INR", name: "Indian Rupee" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "ZAR", name: "South African Rand" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "KRW", name: "South Korean Won" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Złoty" },
  { code: "RUB", name: "Russian Ruble" },
] as const;

function friendlyError(message: string) {
  if (message.includes("row-level security") || message.includes("permission")) {
    return "Your account doesn't have storefront permissions. Ask an admin to enable profiles.is_admin.";
  }
  if (
    message.includes("PGRST204") ||
    /could not find the '[^']+' column/i.test(message)
  ) {
    return "The site_settings table is missing the newest columns. Run the updated supabase/schema.sql in the SQL editor.";
  }
  if (
    message.includes("PGRST205") ||
    /could not find the table|schema cache/i.test(message) ||
    (message.includes("relation") && message.includes("does not exist"))
  ) {
    return "The site_settings table doesn't exist yet. Run the updated supabase/schema.sql in the SQL editor.";
  }
  return message;
}

function Field({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs">
        {label}
      </Label>
      {children}
      {hint && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-base font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function BannerPreview({ banner }: { banner: SiteBannerSettings }) {
  if (!banner.enabled) {
    return (
      <p className="rounded-xl border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
        Banner is off — the storefront header stays clean.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-foreground px-4 py-2 text-center text-[10px] font-semibold tracking-[0.14em] text-background uppercase sm:text-[11px]">
      {banner.message || "Your announcement message"}
    </div>
  );
}

function WelcomePopupPreview({ popup }: { popup: SiteWelcomePopupSettings }) {
  if (!popup.enabled) {
    return (
      <p className="rounded-xl border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
        Popup is off — new visitors go straight to the store.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Popup preview
      </p>
      <div className="mx-auto mt-3 max-w-xs overflow-hidden rounded-2xl border bg-card text-center shadow-sm">
        <div className="bg-foreground px-4 pt-5 pb-4 text-background">
          <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-background/10 ring-1 ring-background/20">
            <Gift className="size-4" aria-hidden />
          </span>
          <p className="font-heading mt-2 text-sm leading-tight font-semibold text-balance">
            {popup.title}
          </p>
          {popup.description && (
            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-background/70">
              {popup.description}
            </p>
          )}
        </div>
        <div className="grid gap-2 p-3">
          {popup.code && (
            <span className="rounded-lg border border-dashed bg-muted/40 px-2 py-1.5 font-mono text-xs font-semibold tracking-wider">
              {popup.code}
            </span>
          )}
          <span className="rounded-full bg-primary px-3 py-1 text-[10px] text-primary-foreground">
            {popup.ctaLabel}
          </span>
          <span className="text-[10px] text-muted-foreground">No thanks</span>
        </div>
      </div>
    </div>
  );
}

function VacationPreview({ vacation }: { vacation: SiteVacationSettings }) {
  if (!vacation.enabled) {
    return (
      <p className="rounded-xl border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
        Holiday mode is off — checkout shows no delivery notice.
      </p>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900">
      <CalendarClock className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
      <div>
        <p className="font-medium">Holiday delivery update</p>
        <p className="mt-0.5 leading-relaxed text-amber-800/90">{vacation.message}</p>
      </div>
    </div>
  );
}

function HeroPreview({ hero }: { hero: SiteHeroSettings }) {
  const title = splitHighlight(hero.title, hero.highlight);

  return (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Hero preview
      </p>
      <div className="mt-3">
        {hero.badge && (
          <Badge variant="outline" className="rounded-full text-[10px]">
            {hero.badge}
          </Badge>
        )}
        <p className="font-heading mt-2 text-xl leading-tight font-semibold text-balance">
          {title.before}
          {title.match && <span className="text-muted-foreground">{title.match}</span>}
          {title.after}
        </p>
        {hero.description && (
          <p className="mt-1 line-clamp-2 max-w-lg text-xs text-muted-foreground">
            {hero.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-[11px] text-primary-foreground">
            {hero.primaryLabel}
          </span>
          {hero.secondaryLabel && hero.secondaryHref && (
            <span className="rounded-full border px-3 py-1 text-[11px]">
              {hero.secondaryLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Admin editor for the company name, announcement banner, welcome popup,
 * holiday mode and home-page hero. Saves the single `site_settings` row to
 * Supabase when configured; otherwise keeps the change in the provider and
 * localStorage for the demo session.
 */
export function StorefrontSettingsPanel({
  products,
  canManage,
}: StorefrontSettingsPanelProps) {
  const { settings, setSettings } = useSiteSettings();
  const [draft, setDraft] = React.useState<SiteSettings>(settings);
  const [syncedSettings, setSyncedSettings] = React.useState<SiteSettings>(settings);
  const [saving, setSaving] = React.useState(false);
  const configured = isSupabaseConfigured();

  // Adjust the editor when the provider hydrates a demo save or a successful
  // save replaces the context value. This is the React-recommended
  // "adjust state when a prop changes" pattern rather than an effect.
  if (syncedSettings !== settings) {
    setSyncedSettings(settings);
    setDraft(settings);
  }

  const productOptions = React.useMemo(
    () =>
      products
        .map(({ product }) => ({
          slug: product.slug,
          label: `${product.name} · ${product.brand}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [products]
  );

  const featuredLabel = React.useMemo(() => {
    if (!draft.hero.featuredSlug) return "Automatic (first featured pair)";
    return (
      productOptions.find((option) => option.slug === draft.hero.featuredSlug)?.label ??
      draft.hero.featuredSlug
    );
  }, [draft.hero.featuredSlug, productOptions]);

  function updateHero(patch: Partial<SiteHeroSettings>) {
    setDraft((current) => ({ ...current, hero: { ...current.hero, ...patch } }));
  }

  function updateBanner(patch: Partial<SiteBannerSettings>) {
    setDraft((current) => ({ ...current, banner: { ...current.banner, ...patch } }));
  }

  function updateWelcomePopup(patch: Partial<SiteWelcomePopupSettings>) {
    setDraft((current) => ({
      ...current,
      welcomePopup: { ...current.welcomePopup, ...patch },
    }));
  }

  function updateVacation(patch: Partial<SiteVacationSettings>) {
    setDraft((current) => ({ ...current, vacation: { ...current.vacation, ...patch } }));
  }

  function resetFields() {
    setDraft(DEFAULT_SITE_SETTINGS);
    toast.info("Fields reset", {
      description: "Save changes to publish the defaults on the storefront.",
    });
  }

  async function handleSave() {
    if (!canManage) {
      toast.error("Admin access required", {
        description: "Ask an admin to enable profiles.is_admin for your account.",
      });
      return;
    }

    const next = normalizeSiteSettings(draft);
    if (next.banner.enabled && !next.banner.message) {
      toast.error("Add a banner message before enabling the banner.");
      return;
    }
    if (next.welcomePopup.enabled && !next.welcomePopup.title) {
      toast.error("Add a popup headline before enabling the welcome popup.");
      return;
    }
    if (next.vacation.enabled && !next.vacation.message) {
      toast.error("Add a checkout warning before enabling holiday mode.");
      return;
    }

    setSaving(true);
    try {
      if (configured) {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) throw new Error("Supabase client is not available.");

        const { data, error } = await supabase
          .from("site_settings")
          .upsert(
            {
              id: "default",
              ...settingsToRow(next),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          )
          .select("id")
          .maybeSingle();

        if (error) throw new Error(friendlyError(error.message));
        if (!data) {
          throw new Error(
            "Supabase blocked the save. Check that your account is an admin and try again."
          );
        }

        setSettings(next);
        toast.success("Storefront updated", {
          description: "Saved to Supabase and applied across the site.",
        });
      } else {
        setSettings(next);
        toast.success("Storefront updated", {
          description: "Demo mode — saved in this browser.",
        });
      }

      setDraft(next);
    } catch (error) {
      toast.error("Could not save storefront settings", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-semibold">Storefront</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              Edit the company name, announcement banner, welcome popup, holiday mode and
              home-page hero. Save once and the storefront updates everywhere.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full">
            {configured ? "Supabase" : "Demo mode · this browser"}
          </Badge>
        </header>

        {!canManage && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
            <p>
              You have read-only access. Sign in with an admin account to edit the storefront.
            </p>
          </div>
        )}

        {/* ── Company name ── */}
        <section className="flex flex-col gap-4 rounded-2xl border p-4 sm:p-5">
          <SectionHeading
            icon={Store}
            title="Company name & currency"
            description="Shown in the header, footer, auth pages and page metadata. Currency applies to all prices on the storefront."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Company name"
              htmlFor="store-company-name"
              hint="Use an ampersand if you want the split-colour wordmark in the header."
            >
              <Input
                id="store-company-name"
                value={draft.companyName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, companyName: event.target.value }))
                }
                maxLength={80}
                disabled={!canManage}
                placeholder="Sole & Stone"
              />
            </Field>

            <Field
              label="Currency"
              htmlFor="store-currency"
              hint="Prices across the entire storefront use this currency."
            >
              <Select
                value={draft.currency}
                onValueChange={(value) =>
                  value && setDraft((current) => ({ ...current, currency: value }))
                }
                disabled={!canManage}
              >
                <SelectTrigger id="store-currency" className="w-full" aria-label="Store currency">
                  <span className="min-w-0 flex-1 truncate text-left">
                    {CURRENCIES.find((c) => c.code === draft.currency)
                      ? `${draft.currency} — ${CURRENCIES.find((c) => c.code === draft.currency)!.name}`
                      : draft.currency}
                  </span>
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="font-mono text-xs text-muted-foreground w-10 inline-block">{c.code}</span>
                      {" "}{c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        {/* ── Shipping ── */}
        <section className="flex flex-col gap-4 rounded-2xl border p-4 sm:p-5">
          <SectionHeading
            icon={Truck}
            title="Free shipping threshold"
            description="Orders at or above this amount qualify for free shipping. Applied in the cart, drawer and at checkout."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Minimum order for free shipping (USD)"
              htmlFor="store-free-shipping"
              hint="Set to 0 to offer free shipping on all orders."
            >
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="store-free-shipping"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={draft.freeShippingThreshold}
                  onChange={(event) => {
                    const val = Number(event.target.value);
                    if (Number.isFinite(val) && val >= 0) {
                      setDraft((current) => ({
                        ...current,
                        freeShippingThreshold: Math.round(val),
                      }));
                    }
                  }}
                  disabled={!canManage}
                  className="pl-6"
                  placeholder="250"
                />
              </div>
            </Field>
            <div className="flex items-end">
              <div
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-sm",
                  draft.freeShippingThreshold === 0
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
                    : "bg-muted/40 text-muted-foreground"
                )}
              >
                {draft.freeShippingThreshold === 0 ? (
                  <>Free shipping on <strong className="font-semibold text-emerald-700">all orders</strong></>
                ) : (
                  <>Free shipping on orders over{" "}
                    <strong className="font-semibold text-foreground">
                      ${draft.freeShippingThreshold}
                    </strong>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Announcement banner ── */}
        <section className="flex flex-col gap-4 rounded-2xl border p-4 sm:p-5">
          <SectionHeading
            icon={Megaphone}
            title="Announcement banner"
            description="A slim strip above the header for launches, shipping offers or sale notices."
            action={
              <div className="flex items-center gap-2">
                <Label htmlFor="banner-enabled" className="text-xs">
                  Show banner
                </Label>
                <Switch
                  id="banner-enabled"
                  checked={draft.banner.enabled}
                  onCheckedChange={(checked) => updateBanner({ enabled: checked === true })}
                  disabled={!canManage}
                />
              </div>
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Message"
              htmlFor="banner-message"
              className="sm:col-span-2"
              hint="Keep it short — the strip is centred and uppercase on the storefront."
            >
              <Input
                id="banner-message"
                value={draft.banner.message}
                onChange={(event) => updateBanner({ message: event.target.value })}
                maxLength={200}
                disabled={!canManage}
                placeholder="Free shipping over $250 · 30-day returns"
              />
            </Field>
            <Field
              label="Link (optional)"
              htmlFor="banner-href"
              className="sm:col-span-2"
              hint="Internal paths like /products?sale=1 or a full https:// URL."
            >
              <Input
                id="banner-href"
                value={draft.banner.href}
                onChange={(event) => updateBanner({ href: event.target.value })}
                maxLength={500}
                disabled={!canManage}
                placeholder="/products?sale=1"
              />
            </Field>
          </div>

          <BannerPreview banner={draft.banner} />
        </section>

        {/* ── Welcome discount popup ── */}
        <section className="flex flex-col gap-4 rounded-2xl border p-4 sm:p-5">
          <SectionHeading
            icon={Gift}
            title="Welcome discount popup"
            description="Greets new visitors once with a first-purchase offer. Each browser remembers it has been shown."
            action={
              <div className="flex items-center gap-2">
                <Label htmlFor="popup-enabled" className="text-xs">
                  Show popup
                </Label>
                <Switch
                  id="popup-enabled"
                  checked={draft.welcomePopup.enabled}
                  onCheckedChange={(checked) =>
                    updateWelcomePopup({ enabled: checked === true })
                  }
                  disabled={!canManage}
                />
              </div>
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Headline"
              htmlFor="popup-title"
              className="sm:col-span-2"
              hint="The first thing a new visitor sees — keep it short and specific."
            >
              <Input
                id="popup-title"
                value={draft.welcomePopup.title}
                onChange={(event) => updateWelcomePopup({ title: event.target.value })}
                maxLength={120}
                disabled={!canManage}
                placeholder="Get 10% off your first purchase!"
              />
            </Field>

            <Field
              label="Description"
              htmlFor="popup-description"
              className="sm:col-span-2"
              hint="Optional supporting line. Leave blank to show the headline only."
            >
              <Textarea
                id="popup-description"
                value={draft.welcomePopup.description}
                onChange={(event) =>
                  updateWelcomePopup({ description: event.target.value })
                }
                maxLength={300}
                rows={2}
                disabled={!canManage}
              />
            </Field>

            <Field
              label="Discount code"
              htmlFor="popup-code"
              hint="Shown with a copy button. Leave blank to hide the code block."
            >
              <Input
                id="popup-code"
                value={draft.welcomePopup.code}
                onChange={(event) => updateWelcomePopup({ code: event.target.value })}
                maxLength={40}
                disabled={!canManage}
                placeholder="WELCOME10"
                className="font-mono uppercase"
              />
            </Field>

            <Field label="Button label" htmlFor="popup-cta-label">
              <Input
                id="popup-cta-label"
                value={draft.welcomePopup.ctaLabel}
                onChange={(event) => updateWelcomePopup({ ctaLabel: event.target.value })}
                maxLength={40}
                disabled={!canManage}
                placeholder="Shop now"
              />
            </Field>

            <Field
              label="Button link"
              htmlFor="popup-cta-href"
              className="sm:col-span-2"
              hint="Where the main button sends the visitor. Internal paths or a full https:// URL."
            >
              <Input
                id="popup-cta-href"
                value={draft.welcomePopup.ctaHref}
                onChange={(event) => updateWelcomePopup({ ctaHref: event.target.value })}
                maxLength={500}
                disabled={!canManage}
                placeholder="/products"
              />
            </Field>
          </div>

          <WelcomePopupPreview popup={draft.welcomePopup} />
        </section>

        {/* ── Holiday / vacation mode ── */}
        <section className="flex flex-col gap-4 rounded-2xl border p-4 sm:p-5">
          <SectionHeading
            icon={CalendarClock}
            title="Holiday / vacation mode"
            description="Adds a delivery warning to checkout while the store is closed. Orders can still be placed."
            action={
              <div className="flex items-center gap-2">
                <Label htmlFor="vacation-enabled" className="text-xs">
                  Holiday mode
                </Label>
                <Switch
                  id="vacation-enabled"
                  checked={draft.vacation.enabled}
                  onCheckedChange={(checked) => updateVacation({ enabled: checked === true })}
                  disabled={!canManage}
                />
              </div>
            }
          />

          <Field
            label="Checkout warning"
            htmlFor="vacation-message"
            hint="Shown above checkout on every step. Mention the date delivery resumes."
          >
            <Textarea
              id="vacation-message"
              value={draft.vacation.message}
              onChange={(event) => updateVacation({ message: event.target.value })}
              maxLength={300}
              rows={2}
              disabled={!canManage}
              placeholder="We are accepting orders, but delivery will start on Monday."
            />
          </Field>

          <VacationPreview vacation={draft.vacation} />
        </section>

        {/* ── Hero ── */}
        <section className="flex flex-col gap-4 rounded-2xl border p-4 sm:p-5">
          <SectionHeading
            icon={ImageIcon}
            title="Home page hero"
            description="Headline, calls to action, photo and the featured pair in the price chip."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Eyebrow badge" htmlFor="hero-badge" hint="Leave blank to hide it.">
              <Input
                id="hero-badge"
                value={draft.hero.badge}
                onChange={(event) => updateHero({ badge: event.target.value })}
                maxLength={80}
                disabled={!canManage}
                placeholder="Autumn Release 2026"
              />
            </Field>

            <Field
              label="Highlighted word"
              htmlFor="hero-highlight"
              hint="Must appear in the headline. Leave blank for a single-colour title."
            >
              <Input
                id="hero-highlight"
                value={draft.hero.highlight}
                onChange={(event) => updateHero({ highlight: event.target.value })}
                maxLength={60}
                disabled={!canManage}
                placeholder="every"
              />
            </Field>

            <Field
              label="Headline"
              htmlFor="hero-title"
              className="sm:col-span-2"
              hint="The highlighted word is matched case-insensitively."
            >
              <Input
                id="hero-title"
                value={draft.hero.title}
                onChange={(event) => updateHero({ title: event.target.value })}
                maxLength={180}
                disabled={!canManage}
                placeholder="Footwear that carries every step."
              />
            </Field>

            <Field
              label="Description"
              htmlFor="hero-description"
              className="sm:col-span-2"
            >
              <Textarea
                id="hero-description"
                value={draft.hero.description}
                onChange={(event) => updateHero({ description: event.target.value })}
                maxLength={400}
                rows={3}
                disabled={!canManage}
              />
            </Field>

            <Field label="Primary button label" htmlFor="hero-primary-label">
              <Input
                id="hero-primary-label"
                value={draft.hero.primaryLabel}
                onChange={(event) => updateHero({ primaryLabel: event.target.value })}
                maxLength={60}
                disabled={!canManage}
              />
            </Field>

            <Field label="Primary button link" htmlFor="hero-primary-href">
              <Input
                id="hero-primary-href"
                value={draft.hero.primaryHref}
                onChange={(event) => updateHero({ primaryHref: event.target.value })}
                maxLength={500}
                disabled={!canManage}
                placeholder="/products"
              />
            </Field>

            <Field
              label="Secondary button label"
              htmlFor="hero-secondary-label"
              hint="Leave either secondary field blank to hide the button."
            >
              <Input
                id="hero-secondary-label"
                value={draft.hero.secondaryLabel}
                onChange={(event) => updateHero({ secondaryLabel: event.target.value })}
                maxLength={60}
                disabled={!canManage}
              />
            </Field>

            <Field label="Secondary button link" htmlFor="hero-secondary-href">
              <Input
                id="hero-secondary-href"
                value={draft.hero.secondaryHref}
                onChange={(event) => updateHero({ secondaryHref: event.target.value })}
                maxLength={500}
                disabled={!canManage}
                placeholder="/products?sale=1"
              />
            </Field>

            <Field
              label="Featured product"
              htmlFor="hero-featured"
              className="sm:col-span-2"
              hint="Supplies the hero photo, price chip and View link when no image override is set."
            >
              <Select
                value={draft.hero.featuredSlug || "auto"}
                onValueChange={(value) =>
                  updateHero({ featuredSlug: !value || value === "auto" ? "" : value })
                }
                disabled={!canManage}
              >
                <SelectTrigger id="hero-featured" className="w-full" aria-label="Featured hero product">
                  <span className="min-w-0 flex-1 truncate text-left">{featuredLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatic (first featured pair)</SelectItem>
                  {productOptions.map((option) => (
                    <SelectItem key={option.slug} value={option.slug}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Image override (optional)"
              htmlFor="hero-image"
              hint="Local path or https URL. Leave blank to use the featured product photo."
            >
              <Input
                id="hero-image"
                value={draft.hero.image}
                onChange={(event) => updateHero({ image: event.target.value })}
                maxLength={1000}
                disabled={!canManage}
                placeholder="/img/products/am1-orange-white.jpg"
              />
            </Field>

            <Field label="Image alt text" htmlFor="hero-image-alt">
              <Input
                id="hero-image-alt"
                value={draft.hero.imageAlt}
                onChange={(event) => updateHero({ imageAlt: event.target.value })}
                maxLength={200}
                disabled={!canManage}
                placeholder="Air Max 1 floating product shot"
              />
            </Field>
          </div>

          <HeroPreview hero={draft.hero} />
        </section>

        <footer className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button onClick={() => void handleSave()} disabled={saving || !canManage}>
            {saving ? (
              <Loader2 className="animate-spin" data-icon="inline-start" aria-hidden />
            ) : (
              <Save data-icon="inline-start" aria-hidden />
            )}
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button variant="outline" onClick={resetFields} disabled={saving || !canManage}>
            <RotateCcw data-icon="inline-start" aria-hidden />
            Reset fields
          </Button>
          <p className="text-[11px] text-muted-foreground sm:ml-auto">
            {configured
              ? "Saves to the public.site_settings row."
              : "Demo mode keeps this change in this browser."}
          </p>
        </footer>
      </CardContent>
    </Card>
  );
}
