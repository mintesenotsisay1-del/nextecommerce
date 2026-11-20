import { demoAdminOrders } from "@/lib/data/reviews";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionUser, getSupabaseServerClient } from "@/lib/supabase/server";
import type { Order, OrderStatus } from "@/lib/types";

type DbOrderRow = {
  id: string;
  created_at: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  total: number;
  items: Order["items"] | null;
  customer: Order["customer"] | null;
};

export type AdminOrderData = {
  user: Awaited<ReturnType<typeof getSessionUser>>;
  configured: boolean;
  isAdmin: boolean;
  orders: Order[];
  ordersLive: boolean;
};

/**
 * Loads the same order source the admin dashboard uses. Customer profiles
 * share this helper so demo/live fallbacks stay perfectly in sync.
 */
export async function loadAdminOrderData(): Promise<AdminOrderData> {
  const user = await getSessionUser();
  const configured = isSupabaseConfigured();
  let orders: Order[] = [];
  let ordersLive = false;
  let isAdmin = false;

  if (configured) {
    const supabase = await getSupabaseServerClient();

    if (supabase) {
      const { data: adminFlag, error: adminError } = await supabase.rpc("is_admin");
      if (adminError) {
        console.error("[admin] Could not check admin access:", adminError.message);
      }
      isAdmin = adminFlag === true;

      const { data, error } = (await supabase
        .from("orders")
        .select("id, created_at, status, subtotal, shipping, total, items, customer")
        .order("created_at", { ascending: false })
        .limit(100)
        .returns<DbOrderRow[]>()) as {
        data: DbOrderRow[] | null;
        error: { message: string } | null;
      };

      if (error) {
        console.error("[admin] Could not load orders:", error.message);
      }

      if (data && data.length > 0) {
        ordersLive = true;
        orders = data.map((row) => ({
          id: row.id,
          createdAt: row.created_at,
          status: row.status,
          subtotal: row.subtotal,
          shipping: row.shipping,
          total: row.total,
          items: row.items ?? [],
          customer:
            row.customer ??
            ({
              fullName: "",
              email: "",
              phone: "",
              address: "",
              city: "",
              postalCode: "",
              country: "",
            } satisfies Order["customer"]),
        }));
      }
    }
  }

  if (!ordersLive) {
    orders = demoAdminOrders();
  }

  return { user, configured, isAdmin, orders, ordersLive };
}
