import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Server-side Supabase client for App Router (Server Components / Route Handlers).
 * Returns `undefined` in demo mode (no credentials configured yet).
 */
export async function getSupabaseServerClient(): Promise<SupabaseClient | undefined> {
  if (!isSupabaseConfigured()) return undefined;

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore because
          // proxy.ts refreshes sessions before they expire.
        }
      },
    },
  });
}

/** Reads the currently signed-in user (or null in demo mode). */
export async function getSessionUser() {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
