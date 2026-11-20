import type { Metadata } from "next";
import { AccountDashboard } from "@/components/account/account-dashboard";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { savedAddressFromProfile, type SavedAddress } from "@/lib/account/address";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false },
};

export default async function AccountPage() {
  const [user, supabase] = await Promise.all([
    getSessionUser(),
    getSupabaseServerClient(),
  ]);
  const configured = isSupabaseConfigured();

  // Prefer the profiles table for display name — it reflects any updates made
  // after signup. Fall back to auth metadata → email prefix → default.
  let profileName: string | null = null;
  let profileMemberSince: string | null = null;
  let savedAddress: SavedAddress | null = null;

  if (configured && supabase && user) {
    // `*` keeps this query working before the optional profile-address
    // migration has been applied — missing columns simply come back undefined.
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      profileName = profile.full_name ?? null;
      profileMemberSince = profile.created_at ?? null;
      savedAddress = savedAddressFromProfile(profile);
    }
  }

  const displayName =
    profileName ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Shopper";

  const initials = displayName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AccountDashboard
      userId={user?.id ?? null}
      displayName={displayName}
      email={user?.email ?? null}
      initials={initials}
      signedIn={Boolean(user)}
      configured={configured}
      memberSince={profileMemberSince ?? user?.created_at ?? null}
      initialAddress={savedAddress}
    />
  );
}
