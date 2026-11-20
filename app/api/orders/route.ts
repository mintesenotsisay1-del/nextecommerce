import { NextResponse } from "next/server";
import { PRODUCTS } from "@/lib/data/products";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DEFAULT_SITE_SETTINGS } from "@/lib/site-settings";
import type { CartLine, ShippingDetails } from "@/lib/types";

export const dynamic = "force-dynamic";

type IncomingLine = {
  productId: string;
  size: string;
  quantity: number;
};

/**
 * POST /api/orders — creates an order.
 * • Prices are ALWAYS validated server-side against the catalogue —
 *   a tampered client total is ignored.
 * • With Supabase connected the order + items are persisted and the DB id
 *   is returned; otherwise a demo id is generated so the flow completes.
 */
export async function POST(request: Request) {
  let body: {
    items?: IncomingLine[];
    customer?: Partial<ShippingDetails>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const incoming = body.items ?? [];
  const customer = body.customer ?? {};

  if (incoming.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // ── Server-side pricing (never trust the client) ──────────────
  let subtotal = 0;
  const lines: CartLine[] = [];

  for (const line of incoming) {
    const product = PRODUCTS.find((p) => p.id === line.productId);
    if (!product) {
      return NextResponse.json(
        { error: `Unknown product ${line.productId}` },
        { status: 400 }
      );
    }
    const variant = product.sizes.find((s) => s.size === line.size);
    if (!variant || variant.stock <= 0) {
      return NextResponse.json(
        { error: `Size ${line.size} unavailable for ${product.name}` },
        { status: 400 }
      );
    }
    const quantity = Math.max(1, Math.min(10, Math.floor(Number(line.quantity) || 1)));
    subtotal += product.price * quantity;
    lines.push({
      key: `${product.id}::${line.size}`,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      image: product.images[0],
      size: variant.size,
      price: product.price,
      quantity,
    });
  }

  // ── Free-shipping threshold (from site_settings when available) ──
  let freeShippingThreshold = DEFAULT_SITE_SETTINGS.freeShippingThreshold;
  if (isSupabaseConfigured()) {
    try {
      const supabaseForSettings = await getSupabaseServerClient();
      const { data: settingsRow } = await supabaseForSettings!
        .from("site_settings")
        .select("free_shipping_threshold")
        .eq("id", "default")
        .maybeSingle();
      if (settingsRow?.free_shipping_threshold != null) {
        freeShippingThreshold = Number(settingsRow.free_shipping_threshold);
      }
    } catch {
      // Fall back to default if the table doesn't exist yet.
    }
  }

  const shipping = subtotal >= freeShippingThreshold ? 0 : 9.9;
  const total = subtotal + shipping;

  // ── Persist when Supabase is connected ────────────────────────
  if (isSupabaseConfigured()) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Order service is unavailable. Please try again." },
        { status: 503 }
      );
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json(
        { error: "Please sign in before placing an order." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: userData.user.id,
        status: "pending",
        customer: customer,
        items: lines,
        subtotal,
        shipping,
        total,
      })
      .select("id")
      .single();

    if (error) {
      // Table might not exist yet — fall back to demo id so checkout UX completes.
      return NextResponse.json(
        {
          id: `DM-${Date.now().toString().slice(-6)}`,
          warning: `Supabase insert failed: ${error.message}. Saved as demo order.`,
          total,
        },
        { status: 200 }
      );
    }
    return NextResponse.json({ id: data.id, total }, { status: 201 });
  }

  // ── Demo mode: acknowledge and continue ───────────────────────
  return NextResponse.json(
    { id: `DM-${Date.now().toString().slice(-6)}`, total, demo: true },
    { status: 201 }
  );
}
