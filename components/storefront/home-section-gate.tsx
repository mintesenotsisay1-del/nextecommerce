"use client";

import * as React from "react";
import { useSiteSettings } from "@/components/providers/site-settings-provider";

/**
 * Keeps a home-page product section visible or hidden according to the live
 * settings context. Server rendering already applies the Supabase value; this
 * gate also handles demo-mode localStorage settings after hydration.
 */
export function HomeSectionGate({
  section,
  children,
}: {
  section: "featured" | "newArrivals";
  children: React.ReactNode;
}) {
  const { settings } = useSiteSettings();
  const visible =
    section === "featured"
      ? settings.homeLayout.showFeatured
      : settings.homeLayout.showNewArrivals;

  return visible ? <>{children}</> : null;
}
