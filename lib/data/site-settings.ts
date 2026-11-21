import { cache } from "react";
import {
  DEFAULT_SITE_SETTINGS,
  rowToSettings,
  type SiteSettings,
  type SiteSettingsRow,
} from "@/lib/site-settings";
import { getSupabasePublicClient } from "@/lib/supabase/public";

/**
 * Public site settings for the storefront chrome (company name, banner, hero).
 *
 * The `site_settings` table is a single public row. When Supabase isn't
 * configured, the table hasn't been created yet, or the request fails, the
 * local defaults keep the storefront fully rendered.
 */
export const loadSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = getSupabasePublicClient();
  if (!supabase) return DEFAULT_SITE_SETTINGS;

  try {
    const { data, error } = await supabase
      .from("site_settings")
      // `*` keeps older deployments working before the welcome_popup /
      // vacation_mode columns have been added; missing fields fall back to
      // the defaults in lib/site-settings.ts.
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      const missingTable =
        error.code === "PGRST205" ||
        /could not find the table|schema cache/i.test(error.message);

      console.error(
        missingTable
          ? "[site-settings] public.site_settings is missing — run supabase/schema.sql in the Supabase SQL editor."
          : `[site-settings] Could not load settings: ${error.message}`
      );
      return DEFAULT_SITE_SETTINGS;
    }

    return rowToSettings(data as SiteSettingsRow | null);
  } catch (error) {
    console.error("[site-settings] Supabase request failed:", error);
    return DEFAULT_SITE_SETTINGS;
  }
});
