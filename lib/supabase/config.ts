/**
 * Central place to detect whether real Supabase credentials are provided.
 * Placeholder values (from .env.local.example) keep the app runnable in
 * "demo mode": everything works locally, data persistence is skipped.
 */

const FALLBACK_URL = "https://YOUR-PROJECT.supabase.co";
const FALLBACK_KEY = "YOUR-ANON-KEY";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;

export function isSupabaseConfigured(): boolean {
  return (
    !!SUPABASE_URL &&
    !!SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("YOUR-PROJECT") &&
    !SUPABASE_ANON_KEY.includes("YOUR-ANON-KEY")
  );
}

export const isDemoMode = !isSupabaseConfigured();
