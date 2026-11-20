"use client";

import * as React from "react";
import {
  normalizeSiteSettings,
  SITE_SETTINGS_STORAGE_KEY,
  type SiteSettings,
} from "@/lib/site-settings";
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

export function SiteSettingsProvider({
  initialSettings,
  children,
}: {
  initialSettings: SiteSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettingsState] = React.useState(initialSettings);
  const [hydrated, setHydrated] = React.useState(false);

  // Demo mode has no server row to read, so restore the last local save after
  // hydration. The animation-frame callback keeps the first paint identical
  // between server and client.
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!isSupabaseConfigured()) {
        try {
          const raw = window.localStorage.getItem(SITE_SETTINGS_STORAGE_KEY);
          if (raw) setSettingsState(normalizeSiteSettings(JSON.parse(raw)));
        } catch {
          // Corrupted or blocked storage — keep the server defaults.
        }
      }
      setHydrated(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const setSettings = React.useCallback((next: SiteSettings) => {
    const normalized = normalizeSiteSettings(next);
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
