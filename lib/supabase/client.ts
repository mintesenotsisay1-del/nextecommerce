"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

let client: SupabaseClient | undefined;

/**
 * Browser-side Supabase client. Returns `undefined` when the project
 * credentials have not been set yet (demo mode).
 */
export function getSupabaseBrowserClient(): SupabaseClient | undefined {
  if (!isSupabaseConfigured()) return undefined;
  if (client) return client;
  client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
