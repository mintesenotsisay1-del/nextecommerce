"use client";

import * as React from "react";

/**
 * One-shot localStorage hydration for client providers.
 *
 * The read happens inside an animation-frame callback (a subscription
 * callback — not synchronously in the effect body), so no setState is called
 * during the effect itself and the initial render stays pure. Value stays at
 * `fallback` during SSR and the first frame, then fills in — no
 * hydration-mismatch risk.
 *
 * Returns `[value, setValue, hydrated]`.
 */
export function useHydratedJson<T>(key: string, fallback: T) {
  const [value, setValue] = React.useState<T>(fallback);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) setValue(JSON.parse(raw) as T);
      } catch {
        // corrupted or blocked storage — keep the fallback
      }
      setHydrated(true);
    });
    return () => cancelAnimationFrame(id);
  }, [key]);

  return [value, setValue, hydrated] as const;
}
