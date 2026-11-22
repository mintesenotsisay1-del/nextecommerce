"use client";

import * as React from "react";
import {
  normalizeSiteSettings,
  SITE_SETTINGS_STORAGE_KEY,
  siteThemeVariables,
  type SiteSettings,
} from "@/lib/site-settings";
import { setActiveCurrency } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type SiteSettingsContextValue = {
  settings: SiteSettings;
  /** Normalizes and applies settings; persists locally in demo mode. */
  setSettings: (next: SiteSettings) => void;
  /** True once the demo-mode localStorage check has run. */
  hydrated: boolean;
};

const SiteSettingsContext = React.createContext<SiteSettingsContextValue | null>(null);

function persistLocally(settings: SiteSettings) {
  try {
    window.localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be blocked or full — the in-memory value still works.
  }
}

/**
 * Writes the theme variables onto `<html>` immediately. The server renders the
 * same variables, so this only changes anything after an admin saves a colour.
 */
function applyTheme(settings: SiteSettings) {
  const root = document.documentElement;
  for (const [property, value] of Object.entries(
    siteThemeVariables(settings.appearance)
  )) {
    root.style.setProperty(property, value);
  }
}

export function SiteSettingsProvider({
  initialSettings,
  children,
}: {
  initialSettings: SiteSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettingsState] = React.useState(() => {
    // Sync the module-level currency with the server-rendered initial value
    // so the first client render uses the correct currency immediately.
    setActiveCurrency(initialSettings.currency);
    return initialSettings;
  });
  const [hydrated, setHydrated] = React.useState(false);

  // Demo mode has no server row to read, so restore the last local save after
  // hydration. The animation-frame callback keeps the first paint identical
  // between server and client.
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!isSupabaseConfigured()) {
        try {
          const raw = window.localStorage.getItem(SITE_SETTINGS_STORAGE_KEY);
          if (raw) {
            const restored = normalizeSiteSettings(JSON.parse(raw));
            setActiveCurrency(restored.currency);
            setSettingsState(restored);
          }
        } catch {
          // Corrupted or blocked storage — keep the server defaults.
        }
      }
      setHydrated(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  // Keep the CSS variables in sync with settings restored from localStorage
  // or changed by another component.
  React.useEffect(() => {
    applyTheme(settings);
  }, [settings]);

  const setSettings = React.useCallback((next: SiteSettings) => {
    const normalized = normalizeSiteSettings(next);
    setActiveCurrency(normalized.currency);
    applyTheme(normalized);
    setSettingsState(normalized);
    if (!isSupabaseConfigured()) persistLocally(normalized);
  }, []);

  const value = React.useMemo(
    () => ({ settings, setSettings, hydrated }),
    [settings, setSettings, hydrated]
  );

  return (
    <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = React.useContext(SiteSettingsContext);
  if (!context) {
    throw new Error("useSiteSettings must be used inside SiteSettingsProvider.");
  }
  return context;
}
