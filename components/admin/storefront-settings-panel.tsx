"use client";

import * as React from "react";
import {
  ImageIcon,
  Loader2,
  LockKeyhole,
  Megaphone,
  RotateCcw,
  Save,
  Store,
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
} from "@/lib/site-settings";
import type { AdminProduct } from "@/lib/types";
import { cn } from "@/lib/utils";

type StorefrontSettingsPanelProps = {
  products: AdminProduct[];
  canManage: boolean;
};

function friendlyError(message: string) {
  if (message.includes("row-level security") || message.includes("permission")) {
    return "Your account doesn't have storefront permissions. Ask an admin to enable profiles.is_admin.";
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
 * Admin editor for the company name, announcement banner and home-page hero.
 * Saves the single `site_settings` row to Supabase when configured; otherwise
 * keeps the change in the provider and localStorage for the demo session.
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
              Edit the company name, announcement banner and home-page hero. Save once and the
              storefront header, footer, banner and hero update together.
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
            title="Company name"
            description="Shown in the header, footer, auth pages and page metadata."
          />
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
