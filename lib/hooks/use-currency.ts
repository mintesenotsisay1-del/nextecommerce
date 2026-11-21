"use client";

import { useSiteSettings } from "@/components/providers/site-settings-provider";

/**
 * Returns the active currency code and a price formatter that uses it.
 *
 * Usage:
 *   const { currency, fmt } = useCurrency();
 *   fmt(149)  // → "ETB 149" or "$149" depending on admin setting
 */
export function useCurrency() {
  const { settings } = useSiteSettings();
  const currency = settings.currency ?? "USD";

  function fmt(value: number): string {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${currency} ${value.toFixed(0)}`;
    }
  }

  return { currency, fmt };
}
