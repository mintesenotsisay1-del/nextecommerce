/**
 * Active currency for the storefront.
 *
 * The SiteSettingsProvider writes to this whenever settings change, so every
 * `formatPrice(x)` call automatically uses the admin-configured currency
 * without needing to thread currency through every prop or hook call.
 *
 * Server components pass the currency explicitly via the second argument.
 */
let _activeCurrency = "USD";

/** Called once by SiteSettingsProvider on mount and on every settings change. */
export function setActiveCurrency(code: string) {
  _activeCurrency = code || "USD";
}

export function getActiveCurrency(): string {
  return _activeCurrency;
}

/**
 * Formats a number as a currency string.
 *
 * @param value    - The numeric amount.
 * @param currency - ISO 4217 code. Defaults to the admin-configured active
 *                   currency (set by SiteSettingsProvider). Pass explicitly
 *                   in Server Components where the provider isn't available.
 */
export function formatPrice(value: number, currency = _activeCurrency): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    // Fallback for unknown/unsupported currency codes.
    return `${currency} ${value.toFixed(0)}`;
  }
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function discountPercent(price: number, compareAt?: number): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
