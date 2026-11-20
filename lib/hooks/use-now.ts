"use client";

import * as React from "react";

/**
 * Wall-clock read that keeps the render pure: `Date.now()` is captured inside
 * an animation-frame callback after mount instead of during render. Returns
 * `null` during SSR / the first frame, so time-dependent UI can show a static
 * fallback and fill in after hydration.
 */
export function useNow(): number | null {
  const [now, setNow] = React.useState<number | null>(null);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setNow(Date.now()));
    return () => cancelAnimationFrame(id);
  }, []);

  return now;
}
