import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/config";

let client: SupabaseClient | undefined;

/**
 * Cookie-free Supabase client for public catalogue reads in Server Components.
 *
 * Unlike `getSupabaseServerClient`, this does not touch `cookies()`, so product
 * pages can read published rows without turning the whole route into a user
 * specific render. RLS still applies with the anon key.
 */
export function getSupabasePublicClient(): SupabaseClient | undefined {
  if (!isSupabaseConfigured()) return undefined;
  if (client) return client;

  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return client;
}
