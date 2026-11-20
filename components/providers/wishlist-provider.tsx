"use client";

import * as React from "react";
import { toast } from "sonner";
import { useHydratedJson } from "@/lib/hooks/use-hydrated-json";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type WishlistProductAlias = {
  /** App-level product id (the legacy local id for seeded demo pairs). */
  id: string;
  slug: string;
};

type WishlistContextValue = {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => boolean;
  clear: () => void;
  /** True once the device wishlist has been read from localStorage. */
  hydrated: boolean;
  /** True while a signed-in wishlist is being merged with Supabase. */
  syncing: boolean;
  signedIn: boolean;
};

const WishlistContext = React.createContext<WishlistContextValue | null>(null);
const STORAGE_KEY = "sole-stone-wishlist-v1";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mergeIds(...lists: string[][]) {
  return Array.from(new Set(lists.flat()));
}

export function WishlistProvider({
  children,
  productAliases = [],
}: {
  children: React.ReactNode;
  /** Maps legacy/local product ids to Supabase product slugs for sync. */
  productAliases?: WishlistProductAlias[];
}) {
  const [ids, setIds, hydrated] = useHydratedJson<string[]>(STORAGE_KEY, []);
  const [signedIn, setSignedIn] = React.useState(false);
  const [syncing, setSyncing] = React.useState(() => isSupabaseConfigured());
  const idsRef = React.useRef<string[]>(ids);
  const userIdRef = React.useRef<string | null>(null);
  const dbIdByAppIdRef = React.useRef<Map<string, string>>(new Map());
  const appIdByDbIdRef = React.useRef<Map<string, string>>(new Map());
  const syncErrorShownRef = React.useRef(false);

  const localIdBySlug = React.useMemo(
    () => new Map(productAliases.map((product) => [product.slug, product.id])),
    [productAliases]
  );
  const localSlugs = React.useMemo(
    () => Array.from(new Set(productAliases.map((product) => product.slug))),
    [productAliases]
  );

  React.useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      /* storage can be blocked — the in-memory state still works */
    }
  }, [ids, hydrated]);

  React.useEffect(() => {
    if (!hydrated || !isSupabaseConfigured()) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;

    const applyRemote = async (userId: string) => {
      setSyncing(true);

      try {
        const [productResult, wishlistResult] = await Promise.all([
          supabase.from("products").select("id,slug").in("slug", localSlugs),
          supabase.from("wishlist").select("product_id").eq("user_id", userId),
        ]);

        if (cancelled) return;

        if (productResult.error) {
          console.warn("[wishlist] Could not map local products to Supabase:", productResult.error.message);
        }
        if (wishlistResult.error) throw wishlistResult.error;

        const dbIdByAppId = new Map<string, string>();
        const appIdByDbId = new Map<string, string>();

        for (const row of productResult.data ?? []) {
          const appId = localIdBySlug.get(row.slug) ?? row.id;
          dbIdByAppId.set(appId, row.id);
          appIdByDbId.set(row.id, appId);
        }

        dbIdByAppIdRef.current = dbIdByAppId;
        appIdByDbIdRef.current = appIdByDbId;

        const remoteIds = (wishlistResult.data ?? []).map(
          (row) => appIdByDbId.get(row.product_id) ?? row.product_id
        );
        const merged = mergeIds(idsRef.current, remoteIds);

        idsRef.current = merged;
        setIds(merged);

        // Guest saves made on this device join the account on first sign-in.
        const rows = merged.flatMap((id) => {
          const productId = dbIdByAppId.get(id) ?? (UUID_RE.test(id) ? id : null);
          return productId ? [{ user_id: userId, product_id: productId }] : [];
        });

        if (rows.length) {
          const { error } = await supabase
            .from("wishlist")
            .upsert(rows, { onConflict: "user_id,product_id" });

          if (error) throw error;
        }
      } catch (error) {
        console.error("[wishlist] Supabase sync failed:", error);
        if (!cancelled && !syncErrorShownRef.current) {
          syncErrorShownRef.current = true;
          toast.error("Wishlist sync failed", {
            description: "Your saved pairs are still available on this device.",
          });
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };

    const loadSession = async () => {
      setSyncing(true);

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (cancelled) return;
        if (error) throw error;

        if (!user) {
          userIdRef.current = null;
          setSignedIn(false);
          setSyncing(false);
          return;
        }

        setSignedIn(true);
        if (userIdRef.current === user.id) {
          setSyncing(false);
          return;
        }
        userIdRef.current = user.id;
        await applyRemote(user.id);
      } catch (error) {
        if (cancelled) return;
        console.warn("[wishlist] Could not check the signed-in session:", error);
        setSyncing(false);
      }
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;

      const user = session?.user ?? null;
      const changed = user?.id !== userIdRef.current;

      userIdRef.current = user?.id ?? null;
      setSignedIn(Boolean(user));

      if (!user) {
        dbIdByAppIdRef.current = new Map();
        appIdByDbIdRef.current = new Map();
        setSyncing(false);
        return;
      }

      if (changed) void applyRemote(user.id);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hydrated, localIdBySlug, localSlugs, setIds]);

  const toggle = React.useCallback(
    (id: string) => {
      const wasSaved = idsRef.current.includes(id);
      const next = wasSaved
        ? idsRef.current.filter((item) => item !== id)
        : [...idsRef.current, id];

      idsRef.current = next;
      setIds(next);

      const userId = userIdRef.current;
      const supabase = getSupabaseBrowserClient();
      if (!userId || !supabase) return !wasSaved;

      const productId =
        dbIdByAppIdRef.current.get(id) ?? (UUID_RE.test(id) ? id : undefined);
      if (!productId) return !wasSaved;

      const query = wasSaved
        ? supabase
            .from("wishlist")
            .delete()
            .eq("user_id", userId)
            .eq("product_id", productId)
        : supabase
            .from("wishlist")
            .upsert(
              { user_id: userId, product_id: productId },
              { onConflict: "user_id,product_id" }
            );

      void query.then(({ error }) => {
        if (error) {
          console.error("[wishlist] Could not update Supabase wishlist:", error.message);
          toast.error("Could not sync wishlist change", { description: error.message });
        }
      });

      return !wasSaved;
    },
    [setIds]
  );

  const clear = React.useCallback(() => {
    idsRef.current = [];
    setIds([]);

    const userId = userIdRef.current;
    const supabase = getSupabaseBrowserClient();
    if (!userId || !supabase) return;

    void supabase
      .from("wishlist")
      .delete()
      .eq("user_id", userId)
      .then(({ error }) => {
        if (error) {
          console.error("[wishlist] Could not clear Supabase wishlist:", error.message);
          toast.error("Could not clear synced wishlist", { description: error.message });
        }
      });
  }, [setIds]);

  const has = React.useCallback((id: string) => ids.includes(id), [ids]);

  const value = React.useMemo(
    () => ({ ids, has, toggle, clear, hydrated, syncing, signedIn }),
    [ids, has, toggle, clear, hydrated, syncing, signedIn]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = React.useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
