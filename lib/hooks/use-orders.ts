"use client";

import * as React from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { LOCAL_ORDERS_KEY } from "@/lib/checkout/identity";
import type { CartLine, Order, OrderStatus, ShippingDetails } from "@/lib/types";

/** Statuses that still have a fulfilment journey ahead of them. */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["pending", "processing", "shipped"];

/** Matches a standard Supabase UUID. Demo ids like "DM-123456" don't qualify. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DbOrderRow = {
  id: string;
  created_at: string;
  status: OrderStatus;
  subtotal: number | null;
  shipping: number | null;
  total: number;
  items: CartLine[] | null;
  customer: ShippingDetails | null;
};

const EMPTY_CUSTOMER: ShippingDetails = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
};

function readLocalOrders(): Order[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (order): order is Order =>
        !!order && typeof order === "object" && typeof (order as Order).id === "string"
    );
  } catch {
    return [];
  }
}

/**
 * Loads the signed-in customer's order history, merging Supabase rows with
 * local (demo/checkout) orders and de-duplicating by id.
 *
 * Guest-order claiming: when a user signs in after placing an order as a
 * guest, the row was stored in Supabase with user_id = null (RLS blocks
 * reading it). We detect local UUID orders missing from the DB result and
 * attempt a one-time UPDATE to stamp them with the current user_id, then
 * re-fetch so they appear immediately.
 */
export function useOrders(userId: string | null, configured: boolean, email?: string | null) {
  const [orders, setOrders] = React.useState<Order[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      let list = readLocalOrders();

      if (configured && userId) {
        // Local orders are shared by the device. Only keep rows whose
        // customer email belongs to the signed-in account so one shopper's
        // history can never be claimed or shown to another.
        const signedInEmail = email?.trim().toLowerCase() ?? "";
        list = signedInEmail
          ? list.filter(
              (order) => order.customer?.email?.trim().toLowerCase() === signedInEmail
            )
          : [];

        try {
          const supabase = getSupabaseBrowserClient();
          if (supabase) {
            // ── 1. Fetch orders already linked to this user ──────────
            const { data } = await supabase
              .from("orders")
              .select("id, created_at, status, subtotal, shipping, total, items, customer")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .returns<DbOrderRow[]>();

            const dbOrders: Order[] = (data ?? []).map((row) => ({
              id: row.id,
              createdAt: row.created_at,
              status: row.status,
              subtotal: row.subtotal ?? row.total,
              shipping: row.shipping ?? 0,
              total: row.total,
              items: row.items ?? [],
              customer: row.customer ?? EMPTY_CUSTOMER,
            }));

            const dbIds = new Set(dbOrders.map((o) => o.id));

            // ── 2. Guest-order claiming ───────────────────────────────
            // Local UUID orders not yet linked → placed as guest while
            // Supabase was connected. Stamp them with the current user_id
            // so they become visible via RLS.
            const unclaimedIds = list
              .map((o) => o.id)
              .filter((id) => UUID_RE.test(id) && !dbIds.has(id));

            if (unclaimedIds.length > 0) {
              await supabase
                .from("orders")
                .update({ user_id: userId })
                .in("id", unclaimedIds)
                .is("user_id", null); // only claim truly orphaned rows

              // Re-fetch after claiming so the newly linked orders appear.
              const { data: refreshed } = await supabase
                .from("orders")
                .select("id, created_at, status, subtotal, shipping, total, items, customer")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .returns<DbOrderRow[]>();

              const refreshedOrders: Order[] = (refreshed ?? []).map((row) => ({
                id: row.id,
                createdAt: row.created_at,
                status: row.status,
                subtotal: row.subtotal ?? row.total,
                shipping: row.shipping ?? 0,
                total: row.total,
                items: row.items ?? [],
                customer: row.customer ?? EMPTY_CUSTOMER,
              }));

              const refreshedIds = new Set(refreshedOrders.map((o) => o.id));
              // Merge: DB takes precedence; keep local-only demo orders
              list = [
                ...refreshedOrders,
                ...list.filter((o) => !refreshedIds.has(o.id) && !UUID_RE.test(o.id)),
              ];
            } else {
              // No claiming needed — just merge normally
              list = [...dbOrders, ...list.filter((o) => !dbIds.has(o.id))];
            }
          }
        } catch {
          // Network/storage hiccup — the local copy is still useful.
        }
      }

      list.sort((a, b) => {
        const aTime = Date.parse(a.createdAt) || 0;
        const bTime = Date.parse(b.createdAt) || 0;
        return bTime - aTime;
      });

      if (!cancelled) setOrders(list);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [configured, email, userId]);

  return { orders: orders ?? [], loading: orders === null };
}
