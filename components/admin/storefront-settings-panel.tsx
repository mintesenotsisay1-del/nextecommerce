"use client";

import * as React from "react";
import {
  CalendarClock,
  Gift,
  ImageIcon,
  LayoutGrid,
  Loader2,
  LockKeyhole,
  Megaphone,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
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
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { formatPrice } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  DEFAULT_SITE_SETTINGS,
  normalizeHexColor,
  normalizeSiteSettings,
  readableTextColor,
  settingsToRow,
  splitHighlight,
  type SiteAppearanceSettings,
  type SiteBannerSettings,
  type SiteHeroSettings,
  type SiteHomeLayoutSettings,
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

const THEME_PRESETS = [
  { name: "Emerald", color: "#007a55" },
  { name: "Midnight", color: "#18181b" },
  { name: "Royal blue", color: "#1d4ed8" },
  { name: "Violet", color: "#7c3aed" },
  { name: "Crimson", color: "#b91c1c" },
  { name: "Amber", color: "#b45309" },
  { name: "Rose", color: "#be185d" },
] as const;

const HEX_COLOR_INPUT = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

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

function ToggleField({
  label,
  hint,
  id,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  label: string;
  hint?: string;
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border bg-muted/20 px-3 py-2.5",
        className
      )}
    >
      <div className="min-w-0">
        <Label htmlFor={id} className="text-xs">
          {label}
        </Label>
        {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
      />
    </div>
  );
}

function ColorField({
  id,
  label,
  hint,
  value,
  fallback,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  fallback: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const safeColor = normalizeHexColor(value, fallback);

  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safeColor}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          aria-label={`${label} colour picker`}
          className="size-10 shrink-0 cursor-pointer rounded-lg border bg-background p-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={7}
          disabled={disabled}
          placeholder={fallback}
          className="font-mono uppercase"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </Field>
  );
}

function ThemePreview({ appearance }: { appearance: SiteAppearanceSettings }) {
  const primary = normalizeHexColor(
    appearance.primaryColor,
    DEFAULT_SITE_SETTINGS.appearance.primaryColor
  );
  const banner = normalizeHexColor(
    appearance.bannerColor,
    DEFAULT_SITE_SETTINGS.appearance.bannerColor
  );

  return (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Theme preview
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border bg-background">
        <div
          className="px-3 py-2 text-center text-[10px] font-semibold tracking-[0.14em] uppercase"
          style={{ backgroundColor: banner, color: readableTextColor(banner) }}
        >
          Free shipping · 30-day returns
        </div>
        <div className="flex flex-wrap items-center gap-2 p-3">
          <span
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{ backgroundColor: primary, color: readableTextColor(primary) }}
          >
            Primary button
          </span>
          <span className="rounded-full border px-3 py-1.5 text-[11px]">
            Secondary button
          </span>
        </div>
      </div>
    </div>
  );
}

function LayoutPreview({ layout }: { layout: SiteHomeLayoutSettings }) {
  return (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Desktop grid preview
        </p>
        <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {layout.gridColumns} per row
        </span>
      </div>
      <div
        className={cn(
          "mt-3 grid gap-2",
          layout.gridColumns === 2 ? "grid-cols-2" : "grid-cols-4"
        )}
      >
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="aspect-[4/5] rounded-lg border bg-background"
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-semibold",
            layout.showFeatured
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          Featured {layout.showFeatured ? "on" : "off"}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-semibold",
            layout.showNewArrivals
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          New arrivals {layout.showNewArrivals ? "on" : "off"}
        </span>
      </div>
    </div>
  );
}

function BannerPreview({
  banner,
  color,
}: {
  banner: SiteBannerSettings;
  color: string;
}) {
  if (!banner.enabled) {
    return (
      <p className="rounded-xl border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
        Banner is off — the storefront header stays clean.
      </p>
    );
  }

  const background = normalizeHexColor(
    color,
    DEFAULT_SITE_SETTINGS.appearance.bannerColor
  );

  return (
    <div
      className="relative overflow-hidden rounded-xl px-8 py-2 text-center text-[10px] font-semibold tracking-[0.14em] uppercase sm:text-[11px]"
      style={{ backgroundColor: background, color: readableTextColor(background) }}
    >
      {banner.message || "Your announcement message"}
      {banner.dismissible && (
        <span
          aria-hidden
          className="absolute top-1/2 right-2 -translate-y-1/2 text-sm leading-none opacity-60"
        >
          ×
        </span>
      )}
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

function HeroPreview({
  hero,
  imageSrc,
  productName,
  freeShippingThreshold,
}: {
  hero: SiteHeroSettings;
  imageSrc: string;
  productName: string;
  freeShippingThreshold: number;
}) {
  const title = splitHighlight(hero.title, hero.highlight);
  const imageLeft = hero.imagePosition === "left";
  const shippingText =
    hero.shippingText ||
    (freeShippingThreshold === 0
      ? "Free shipping on all orders"
      : `Free shipping over ${formatPrice(freeShippingThreshold)}`);
  const badges = [
    { icon: Truck, text: shippingText },
    { icon: RotateCcw, text: hero.returnsText },
    { icon: ShieldCheck, text: hero.authenticText },
  ].filter((badge) => badge.text.trim().length > 0);

  return (
    <div className="rounded-2xl border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Hero preview
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            hero.enabled
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {hero.enabled ? "Visible" : "Hidden"}
        </span>
      </div>

      {!hero.enabled ? (
        <p className="mt-3 rounded-xl border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
          Hero is off — the home page starts with the brand strip.
        </p>
      ) : (
        <div
          className={cn(
            "mt-3 grid items-center gap-4",
            hero.showImage && "sm:grid-cols-2"
          )}
        >
          <div className={cn(hero.showImage && imageLeft && "sm:order-2")}>
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
            {hero.showTrustBadges && badges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                {badges.map(({ icon: Icon, text }, index) => (
                  <span key={`${text}-${index}`} className="flex items-center gap-1">
                    <Icon className="size-3" aria-hidden /> {text}
                  </span>
                ))}
              </div>
            )}
          </div>

          {hero.showImage && (
            <div
              className={cn(
                "relative aspect-square overflow-hidden rounded-2xl border bg-background",
                imageLeft && "sm:order-1"
              )}
            >
              {imageSrc ? (
                // Admin-entered URLs and local catalogue images both appear here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt={hero.imageAlt || productName || "Hero preview"}
                  className={cn(
                    "size-full",
                    hero.imageFit === "contain" ? "object-contain" : "object-cover"
                  )}
                />
              ) : (
                <span className="flex size-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="size-6" aria-hidden />
                </span>
              )}
              {hero.showEditorPick && productName && (
                <div className="absolute bottom-2 left-2 max-w-[80%] rounded-xl bg-background/90 p-2 shadow-sm ring-1 ring-foreground/10 backdrop-blur">
                  <p className="text-[8px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {hero.editorPickLabel}
                  </p>
                  <p className="truncate text-[10px] font-medium">{productName}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Admin editor for the company name, shipping, appearance/branding, home-page
 * layout, announcement banner, welcome popup, holiday mode and home-page hero
 * (copy, photo layout, trust badges and the editor's-pick card). Saves the
 * single `site_settings` row to Supabase when configured; otherwise keeps the
 * change in the provider and localStorage for the demo session.
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

  const heroPreviewProduct = React.useMemo(() => {
    const match = products.find(
      ({ product }) => product.slug === draft.hero.featuredSlug
    );
    return (match ?? products[0])?.product;
  }, [products, draft.hero.featuredSlug]);

  const heroPreviewImage =
    draft.hero.image || heroPreviewProduct?.images[0] || "";

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

  function updateAppearance(patch: Partial<SiteAppearanceSettings>) {
    setDraft((current) => ({
      ...current,
      appearance: { ...current.appearance, ...patch },
    }));
  }

  function updateHomeLayout(patch: Partial<SiteHomeLayoutSettings>) {
    setDraft((current) => ({
      ...current,
      homeLayout: { ...current.homeLayout, ...patch },
    }));
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
    if (
      !HEX_COLOR_INPUT.test(draft.appearance.primaryColor.trim()) ||
      !HEX_COLOR_INPUT.test(draft.appearance.bannerColor.trim())
    ) {
      toast.error("Enter a valid HEX colour", {
        description: "Use a 3- or 6-digit HEX code, for example #007a55.",
      });
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
              Edit the company name, currency, shipping, appearance and branding, home-page
              layout, announcement banner, welcome popup, holiday mode and hero — including
              photo layout, trust badges and the editor’s pick card. Save once and the
              storefront updates everywhere.
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

        {/* ── Appearance & branding ── */}
        <section className="flex flex-col gap-4 rounded-2xl border p-4 sm:p-5">
          <SectionHeading
            icon={Palette}
            title="Appearance & branding"
            description="Set the primary button and announcement banner colours with a HEX code. Saved colours update the storefront immediately through CSS variables — no page reload needed."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              id="appearance-primary"
              label="Primary button colour"
              hint="Used by primary buttons, active tabs, focus accents and other brand highlights."
              value={draft.appearance.primaryColor}
              fallback={DEFAULT_SITE_SETTINGS.appearance.primaryColor}
              disabled={!canManage}
              onChange={(value) => updateAppearance({ primaryColor: value })}
            />
            <ColorField
              id="appearance-banner"
              label="Banner background colour"
              hint="Background of the announcement strip above the header. Text contrast is chosen automatically."
              value={draft.appearance.bannerColor}
              fallback={DEFAULT_SITE_SETTINGS.appearance.bannerColor}
              disabled={!canManage}
              onChange={(value) => updateAppearance({ bannerColor: value })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-medium text-muted-foreground">
              Primary presets
            </span>
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.color}
                type="button"
                onClick={() => updateAppearance({ primaryColor: preset.color })}
                disabled={!canManage}
                title={`${preset.name} — ${preset.color}`}
                aria-label={`Use ${preset.name} primary colour ${preset.color}`}
                className="size-6 rounded-full border border-foreground/10 ring-offset-2 ring-offset-background transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: preset.color }}
              />
            ))}
          </div>

          <ThemePreview appearance={draft.appearance} />
        </section>

        {/* ── Home page layout ── */}
        <section className="flex flex-col gap-4 rounded-2xl border p-4 sm:p-5">
          <SectionHeading
            icon={LayoutGrid}
            title="Home page layout"
            description="Choose which product sections appear on the home page and how many cards sit in each row on desktop."
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleField
              id="home-show-featured"
              label="Show Featured section"
              hint="The “Editor’s picks” product row."
              checked={draft.homeLayout.showFeatured}
              onCheckedChange={(checked) => updateHomeLayout({ showFeatured: checked })}
              disabled={!canManage}
            />
            <ToggleField
              id="home-show-new-arrivals"
              label="Show New Arrivals section"
              hint="The “New arrivals” product row."
              checked={draft.homeLayout.showNewArrivals}
              onCheckedChange={(checked) =>
                updateHomeLayout({ showNewArrivals: checked })
              }
              disabled={!canManage}
            />
          </div>

          <Field
            label="Grid columns (products per row)"
            htmlFor="home-grid-columns"
            hint="Choose 2 or 4 cards per row on desktop. Mobile always keeps two columns so cards stay readable. Applies to Featured, New arrivals, Best sellers and Best value."
          >
            <Select
              value={String(draft.homeLayout.gridColumns)}
              onValueChange={(value) =>
                updateHomeLayout({ gridColumns: value === "2" ? 2 : 4 })
              }
              disabled={!canManage}
            >
              <SelectTrigger
                id="home-grid-columns"
                className="w-full sm:max-w-xs"
                aria-label="Products per row on desktop"
              >
                <span className="min-w-0 flex-1 truncate text-left">
                  {draft.homeLayout.gridColumns} columns
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 columns</SelectItem>
                <SelectItem value="4">4 columns</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <LayoutPreview layout={draft.homeLayout} />
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

          <ToggleField
            id="banner-dismissible"
            label="Let shoppers dismiss the banner"
            hint="Turning this off keeps the strip visible on every page view."
            checked={draft.banner.dismissible}
            onCheckedChange={(checked) => updateBanner({ dismissible: checked })}
            disabled={!canManage}
          />

          <BannerPreview
            banner={draft.banner}
            color={draft.appearance.bannerColor}
          />
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

            <Field
              label="Delay before showing (seconds)"
              htmlFor="popup-delay"
              className="sm:col-span-2"
              hint="0 opens the offer as soon as the page loads. Maximum 30 seconds."
            >
              <Input
                id="popup-delay"
                type="number"
                inputMode="numeric"
                min="0"
                max="30"
                step="1"
                value={draft.welcomePopup.delaySeconds}
                onChange={(event) => {
                  const val = Number(event.target.value);
                  if (Number.isFinite(val) && val >= 0 && val <= 30) {
                    updateWelcomePopup({ delaySeconds: Math.round(val) });
                  }
                }}
                disabled={!canManage}
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
            description="Headline, buttons, photo layout, trust badges and the featured pair in the price chip."
            action={
              <div className="flex items-center gap-2">
                <Label htmlFor="hero-enabled" className="text-xs">
                  Show hero
                </Label>
                <Switch
                  id="hero-enabled"
                  checked={draft.hero.enabled}
                  onCheckedChange={(checked) => updateHero({ enabled: checked === true })}
                  disabled={!canManage}
                />
              </div>
            }
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Photo position"
              htmlFor="hero-image-position"
              hint="Desktop layout. Mobile always stacks the copy above the photo."
            >
              <Select
                value={draft.hero.imagePosition}
                onValueChange={(value) =>
                  updateHero({ imagePosition: value === "left" ? "left" : "right" })
                }
                disabled={!canManage}
              >
                <SelectTrigger
                  id="hero-image-position"
                  className="w-full"
                  aria-label="Hero photo position"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {draft.hero.imagePosition === "left"
                      ? "Photo on the left"
                      : "Photo on the right"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Photo on the right</SelectItem>
                  <SelectItem value="left">Photo on the left</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Photo fit"
              htmlFor="hero-image-fit"
              hint="Contain shows the whole cut-out; cover fills the frame."
            >
              <Select
                value={draft.hero.imageFit}
                onValueChange={(value) =>
                  updateHero({ imageFit: value === "contain" ? "contain" : "cover" })
                }
                disabled={!canManage}
              >
                <SelectTrigger
                  id="hero-image-fit"
                  className="w-full"
                  aria-label="Hero photo fit"
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {draft.hero.imageFit === "contain" ? "Contain (whole photo)" : "Cover (fill frame)"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cover (fill frame)</SelectItem>
                  <SelectItem value="contain">Contain (whole photo)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <ToggleField
              id="hero-show-image"
              label="Show hero photo"
              hint="Turn off for a text-only hero that uses the full width."
              checked={draft.hero.showImage}
              onCheckedChange={(checked) => updateHero({ showImage: checked })}
              disabled={!canManage}
              className="sm:col-span-2"
            />
          </div>

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

          <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
              <p className="text-xs font-semibold">Trust badges</p>
            </div>
            <ToggleField
              id="hero-trust-badges"
              label="Show trust badges"
              hint="The small shipping, returns and authenticity strip under the buttons."
              checked={draft.hero.showTrustBadges}
              onCheckedChange={(checked) => updateHero({ showTrustBadges: checked })}
              disabled={!canManage}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Shipping badge"
                htmlFor="hero-shipping-text"
                className="sm:col-span-2"
                hint="Leave blank to build this from the free-shipping threshold and currency."
              >
                <Input
                  id="hero-shipping-text"
                  value={draft.hero.shippingText}
                  onChange={(event) => updateHero({ shippingText: event.target.value })}
                  maxLength={80}
                  disabled={!canManage}
                  placeholder="Free shipping over $250"
                />
              </Field>
              <Field
                label="Returns badge"
                htmlFor="hero-returns-text"
                hint="Leave blank to hide this badge."
              >
                <Input
                  id="hero-returns-text"
                  value={draft.hero.returnsText}
                  onChange={(event) => updateHero({ returnsText: event.target.value })}
                  maxLength={80}
                  disabled={!canManage}
                  placeholder="30-day returns"
                />
              </Field>
              <Field
                label="Authenticity badge"
                htmlFor="hero-authentic-text"
                hint="Leave blank to hide this badge."
              >
                <Input
                  id="hero-authentic-text"
                  value={draft.hero.authenticText}
                  onChange={(event) => updateHero({ authenticText: event.target.value })}
                  maxLength={80}
                  disabled={!canManage}
                  placeholder="100% authentic"
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" aria-hidden />
              <p className="text-xs font-semibold">Editor’s pick card</p>
            </div>
            <ToggleField
              id="hero-editor-pick"
              label="Show product card"
              hint="The floating card with the featured product name, price and View link."
              checked={draft.hero.showEditorPick}
              onCheckedChange={(checked) => updateHero({ showEditorPick: checked })}
              disabled={!canManage}
            />
            <Field
              label="Card label"
              htmlFor="hero-editor-pick-label"
              hint="Shown above the product name in the card."
            >
              <Input
                id="hero-editor-pick-label"
                value={draft.hero.editorPickLabel}
                onChange={(event) => updateHero({ editorPickLabel: event.target.value })}
                maxLength={40}
                disabled={!canManage}
                placeholder="Editor’s pick"
              />
            </Field>
          </div>

          <HeroPreview
            hero={draft.hero}
            imageSrc={heroPreviewImage}
            productName={heroPreviewProduct?.name ?? ""}
            freeShippingThreshold={draft.freeShippingThreshold}
          />
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
