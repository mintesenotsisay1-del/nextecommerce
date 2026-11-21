/**
 * Shared storefront settings: company name, announcement banner, welcome
 * popup, holiday mode and the home-page hero. The same shape is used by the
 * admin editor, the Supabase row mapping and every storefront consumer, so a
 * saved value renders consistently everywhere.
 */

export type SiteHeroImagePosition = "left" | "right";
export type SiteHeroImageFit = "cover" | "contain";

export type SiteHeroSettings = {
  /** Show the hero section on the home page. */
  enabled: boolean;
  badge: string;
  title: string;
  /** Word inside `title` to mute/highlight. Empty hides the accent. */
  highlight: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  /** Optional image override. Empty uses the featured product's first photo. */
  image: string;
  imageAlt: string;
  /** Product slug used for the hero photo, price chip and "View" link. */
  featuredSlug: string;
  /** Which side the photo sits on for desktop layouts. */
  imagePosition: SiteHeroImagePosition;
  /** Cover fills the frame; contain shows the whole product cut-out. */
  imageFit: SiteHeroImageFit;
  /** Hide the photo and let the copy use the full width. */
  showImage: boolean;
  /** Show the shipping / returns / authenticity strip under the CTAs. */
  showTrustBadges: boolean;
  /** Optional override for the shipping badge. Empty builds the text from the threshold. */
  shippingText: string;
  returnsText: string;
  authenticText: string;
  /** Show the floating product card on top of the hero photo. */
  showEditorPick: boolean;
  editorPickLabel: string;
};

export type SiteBannerSettings = {
  enabled: boolean;
  message: string;
  /** Optional link. Empty renders the message as plain text. */
  href: string;
  /** Let shoppers close the strip until the message changes. */
  dismissible: boolean;
};

export type SiteWelcomePopupSettings = {
  enabled: boolean;
  title: string;
  description: string;
  /** Discount code shown in the popup. Empty hides the code block. */
  code: string;
  ctaLabel: string;
  ctaHref: string;
  /** Seconds to wait after the page loads before showing the offer. */
  delaySeconds: number;
};

export type SiteVacationSettings = {
  enabled: boolean;
  /** Warning shown above checkout while the store is closed. */
  message: string;
};

export type SiteSettings = {
  companyName: string;
  /** ISO 4217 currency code, e.g. "USD", "ETB", "EUR". */
  currency: string;
  /** Free shipping threshold in USD. Orders at or above this amount ship free. */
  freeShippingThreshold: number;
  hero: SiteHeroSettings;
  banner: SiteBannerSettings;
  welcomePopup: SiteWelcomePopupSettings;
  vacation: SiteVacationSettings;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  companyName: "Sole & Stone",
  currency: "USD",
  freeShippingThreshold: 250,
  hero: {
    enabled: true,
    badge: "Autumn Release 2026",
    title: "Footwear that carries every step.",
    highlight: "every",
    description:
      "Sneakers, runners, boots, dress & heels — curated in small editions, shipped free over $250, and backed by 30-day returns.",
    primaryLabel: "Shop the collection",
    primaryHref: "/products",
    secondaryLabel: "See what’s on sale",
    secondaryHref: "/products?sale=1",
    image: "",
    imageAlt: "",
    featuredSlug: "air-max-1-white-orange",
    imagePosition: "right",
    imageFit: "cover",
    showImage: true,
    showTrustBadges: true,
    shippingText: "",
    returnsText: "30-day returns",
    authenticText: "100% authentic",
    showEditorPick: true,
    editorPickLabel: "Editor’s pick",
  },
  banner: {
    enabled: false,
    message: "Free shipping over $250 · 30-day easy returns · 100% authentic pairs",
    href: "/products",
    dismissible: true,
  },
  welcomePopup: {
    enabled: false,
    title: "Get 10% off your first purchase!",
    description: "Join the list and use this code at checkout on your first order.",
    code: "WELCOME10",
    ctaLabel: "Shop now",
    ctaHref: "/products",
    delaySeconds: 1,
  },
  vacation: {
    enabled: false,
    message: "We are accepting orders, but delivery will start on Monday.",
  },
};

export const SITE_SETTINGS_STORAGE_KEY = "sole-stone-site-settings-v1";

/** Snake-case shape stored in `public.site_settings`. */
export type SiteSettingsRow = {
  id?: string;
  company_name?: string | null;
  currency?: string | null;
  free_shipping_threshold?: number | null;
  hero?: unknown;
  banner?: unknown;
  welcome_popup?: unknown;
  vacation_mode?: unknown;
  updated_at?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Trimmed text, falling back only when the value isn't a string. */
function text(value: unknown, fallback: string, maxLength = 500): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, maxLength);
}

/** Trimmed text, falling back when the value is missing or blank. */
function textOr(value: unknown, fallback: string, maxLength = 500): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

/** Boolean with a fallback for missing/invalid values. */
function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Whole number bounded to a safe range. */
function wholeNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

/**
 * Accepts unknown data from Supabase, localStorage or the admin form and
 * returns a complete, safely bounded settings object.
 */
export function normalizeSiteSettings(value: unknown): SiteSettings {
  const source = isRecord(value) ? value : {};
  const hero = isRecord(source.hero) ? source.hero : {};
  const banner = isRecord(source.banner) ? source.banner : {};
  const welcomePopup = isRecord(source.welcomePopup) ? source.welcomePopup : {};
  const vacation = isRecord(source.vacation) ? source.vacation : {};
  const defaults = DEFAULT_SITE_SETTINGS;

  const rawThreshold = Number(source.freeShippingThreshold);
  const freeShippingThreshold =
    Number.isFinite(rawThreshold) && rawThreshold >= 0
      ? Math.round(rawThreshold)
      : defaults.freeShippingThreshold;

  // Validate currency: must be a 3-letter uppercase ISO 4217-ish code.
  const rawCurrency = typeof source.currency === "string" ? source.currency.trim().toUpperCase() : "";
  const currency = /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : defaults.currency;

  return {
    companyName: textOr(source.companyName, defaults.companyName, 80),
    currency,
    freeShippingThreshold,
    hero: {
      enabled: bool(hero.enabled, defaults.hero.enabled),
      badge: text(hero.badge, defaults.hero.badge, 80),
      title: textOr(hero.title, defaults.hero.title, 180),
      highlight: text(hero.highlight, defaults.hero.highlight, 60),
      description: textOr(hero.description, defaults.hero.description, 400),
      primaryLabel: textOr(hero.primaryLabel, defaults.hero.primaryLabel, 60),
      primaryHref: textOr(hero.primaryHref, defaults.hero.primaryHref, 500),
      secondaryLabel: text(hero.secondaryLabel, defaults.hero.secondaryLabel, 60),
      secondaryHref: text(hero.secondaryHref, defaults.hero.secondaryHref, 500),
      image: text(hero.image, defaults.hero.image, 1000),
      imageAlt: text(hero.imageAlt, defaults.hero.imageAlt, 200),
      featuredSlug: text(hero.featuredSlug, defaults.hero.featuredSlug, 200),
      imagePosition: hero.imagePosition === "left" ? "left" : "right",
      imageFit: hero.imageFit === "contain" ? "contain" : "cover",
      showImage: bool(hero.showImage, defaults.hero.showImage),
      showTrustBadges: bool(hero.showTrustBadges, defaults.hero.showTrustBadges),
      shippingText: text(hero.shippingText, defaults.hero.shippingText, 80),
      returnsText: text(hero.returnsText, defaults.hero.returnsText, 80),
      authenticText: text(hero.authenticText, defaults.hero.authenticText, 80),
      showEditorPick: bool(hero.showEditorPick, defaults.hero.showEditorPick),
      editorPickLabel: textOr(
        hero.editorPickLabel,
        defaults.hero.editorPickLabel,
        40
      ),
    },
    banner: {
      enabled: bool(banner.enabled, defaults.banner.enabled),
      message: textOr(banner.message, defaults.banner.message, 200),
      href: text(banner.href, defaults.banner.href, 500),
      dismissible: bool(banner.dismissible, defaults.banner.dismissible),
    },
    welcomePopup: {
      enabled: bool(welcomePopup.enabled, defaults.welcomePopup.enabled),
      title: textOr(welcomePopup.title, defaults.welcomePopup.title, 120),
      description: text(
        welcomePopup.description,
        defaults.welcomePopup.description,
        300
      ),
      code: text(welcomePopup.code, defaults.welcomePopup.code, 40),
      ctaLabel: textOr(welcomePopup.ctaLabel, defaults.welcomePopup.ctaLabel, 40),
      ctaHref: textOr(welcomePopup.ctaHref, defaults.welcomePopup.ctaHref, 500),
      delaySeconds: wholeNumber(
        welcomePopup.delaySeconds,
        defaults.welcomePopup.delaySeconds,
        0,
        30
      ),
    },
    vacation: {
      enabled: bool(vacation.enabled, defaults.vacation.enabled),
      message: textOr(vacation.message, defaults.vacation.message, 300),
    },
  };
}

export function rowToSettings(row: SiteSettingsRow | null | undefined): SiteSettings {
  if (!row) return DEFAULT_SITE_SETTINGS;

  return normalizeSiteSettings({
    companyName: row.company_name,
    currency: row.currency,
    freeShippingThreshold: row.free_shipping_threshold,
    hero: row.hero,
    banner: row.banner,
    welcomePopup: row.welcome_popup,
    vacation: row.vacation_mode,
  });
}

export function settingsToRow(settings: SiteSettings) {
  return {
    company_name: settings.companyName,
    currency: settings.currency,
    free_shipping_threshold: settings.freeShippingThreshold,
    hero: settings.hero,
    banner: settings.banner,
    welcome_popup: settings.welcomePopup,
    vacation_mode: settings.vacation,
  };
}

/**
 * Splits a headline around the highlighted word (case-insensitive, first
 * match). Used by the hero and its admin preview so both render identically.
 */
export function splitHighlight(title: string, highlight: string) {
  const needle = highlight.trim();
  if (!needle) return { before: title, match: "", after: "" };

  const index = title.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) return { before: title, match: "", after: "" };

  return {
    before: title.slice(0, index),
    match: title.slice(index, index + needle.length),
    after: title.slice(index + needle.length),
  };
}
