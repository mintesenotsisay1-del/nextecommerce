"use client";

import * as React from "react";
import { useHydratedJson } from "@/lib/hooks/use-hydrated-json";

type RecentlyViewedContextValue = {
  slugs: string[];
  track: (slug: string) => void;
};

const RecentlyViewedContext = React.createContext<RecentlyViewedContextValue | null>(null);
const STORAGE_KEY = "sole-stone-recent-v1";
const MAX_ITEMS = 8;

/** Keeps track of the last viewed products (used by the PDP "Recently viewed" rail). */
export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [slugs, setSlugs, hydrated] = useHydratedJson<string[]>(STORAGE_KEY, []);
  const pendingRef = React.useRef<string[]>([]);

  const track = React.useCallback(
    (slug: string) => {
      if (!hydrated) {
        // The rail's effect runs before storage hydration lands — queue the
        // visit instead of dropping it.
        if (!pendingRef.current.includes(slug)) pendingRef.current.push(slug);
        return;
      }
      setSlugs((prev) => [slug, ...prev.filter((s) => s !== slug)].slice(0, MAX_ITEMS));
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(
          [slug, ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]").filter((s: string) => s !== slug)]
            .slice(0, MAX_ITEMS)
        ));
      } catch {
        /* ignore */
      }
    },
    [hydrated, setSlugs]
  );

  // Flush visits queued before hydration — inside a frame callback so no
  // setState runs directly in the effect body.
  React.useEffect(() => {
    if (!hydrated || pendingRef.current.length === 0) return;
    const queued = pendingRef.current;
    pendingRef.current = [];

    const id = requestAnimationFrame(() => {
      let merged: string[] = [];
      try {
        merged = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as string[];
        if (!Array.isArray(merged)) merged = [];
      } catch {
        merged = [];
      }
      for (const slug of queued) {
        merged = [slug, ...merged.filter((s) => s !== slug)];
      }
      merged = merged.slice(0, MAX_ITEMS);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      setSlugs(merged);
    });
    return () => cancelAnimationFrame(id);
  }, [hydrated, setSlugs]);

  const value = React.useMemo(() => ({ slugs, track }), [slugs, track]);
  return <RecentlyViewedContext.Provider value={value}>{children}</RecentlyViewedContext.Provider>;
}

export function useRecentlyViewed() {
  const ctx = React.useContext(RecentlyViewedContext);
  if (!ctx) throw new Error("useRecentlyViewed must be used inside <RecentlyViewedProvider>");
  return ctx;
}
