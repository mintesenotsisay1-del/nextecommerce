"use client";

import * as React from "react";

/**
 * SSR-safe media query hook.
 *
 * `useSyncExternalStore` keeps the server snapshot stable, then picks up the
 * real browser value immediately after hydration — no layout-shift warnings.
 */
export function useMediaQuery(query: string, serverValue = false) {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", onStoreChange);
      return () => mediaQueryList.removeEventListener("change", onStoreChange);
    },
    [query]
  );

  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query]);

  const getServerSnapshot = React.useCallback(() => serverValue, [serverValue]);

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
