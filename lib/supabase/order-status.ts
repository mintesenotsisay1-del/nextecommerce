"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Order, OrderStatus } from "@/lib/types";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export type OrderStatusResult =
  | { mode: "local" }
  | { mode: "saved" }
  | { mode: "error"; message: string };

/**
 * Persists an order status when the order is a live Supabase row. Demo orders
 * and non-UUID ids intentionally stay local to the current browser session.
 */
export async function persistOrderStatus(
  order: Order,
  status: OrderStatus,
  ordersLive: boolean
): Promise<OrderStatusResult> {
  if (!isSupabaseConfigured() || !ordersLive || !isUuid(order.id)) {
    return { mode: "local" };
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return { mode: "error", message: "Could not reach Supabase." };
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", order.id)
    .select("id");

  if (error || !data?.length) {
    return {
      mode: "error",
      message:
        error?.message ??
        "Supabase blocked the update. Check that your account is an admin and try again.",
    };
  }

  return { mode: "saved" };
}
