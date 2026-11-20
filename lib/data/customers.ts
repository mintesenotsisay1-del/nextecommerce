import type { Order } from "@/lib/types";

/** A customer rolled up from their order history. */
export type CustomerSummary = {
  /** Stable, lower-case identity used in the profile URL. */
  key: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  /** Every order, including cancelled ones. */
  orders: number;
  cancelledOrders: number;
  units: number;
  /** Revenue from non-cancelled orders. */
  spent: number;
  firstOrder: string;
  lastOrder: string;
};

export function customerKeyOf(order: Order) {
  return (order.customer.email || order.customer.fullName || order.id).trim().toLowerCase();
}

export function customerHref(key: string) {
  return `/admin/customers/${encodeURIComponent(key)}`;
}

export function ordersForCustomer(orders: Order[], key: string) {
  return orders
    .filter((order) => customerKeyOf(order) === key)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function aggregateCustomers(orders: Order[]): CustomerSummary[] {
  const rows = new Map<string, CustomerSummary>();

  for (const order of orders) {
    const key = customerKeyOf(order);
    const units = order.items.reduce((sum, line) => sum + line.quantity, 0);
    const cancelled = order.status === "cancelled";
    const current = rows.get(key);
    const time = new Date(order.createdAt).getTime();

    if (current) {
      current.orders += 1;
      current.units += units;
      if (cancelled) current.cancelledOrders += 1;
      else current.spent += order.total;

      if (time >= new Date(current.lastOrder).getTime()) {
        current.name = order.customer.fullName || current.name;
        current.email = order.customer.email || current.email;
        current.phone = order.customer.phone || current.phone;
        current.address = order.customer.address || current.address;
        current.city = order.customer.city || current.city;
        current.postalCode = order.customer.postalCode || current.postalCode;
        current.country = order.customer.country || current.country;
        current.lastOrder = order.createdAt;
      }

      if (time < new Date(current.firstOrder).getTime()) {
        current.firstOrder = order.createdAt;
      }
    } else {
      rows.set(key, {
        key,
        name: order.customer.fullName || "Guest",
        email: order.customer.email,
        phone: order.customer.phone,
        address: order.customer.address,
        city: order.customer.city,
        postalCode: order.customer.postalCode,
        country: order.customer.country,
        orders: 1,
        cancelledOrders: cancelled ? 1 : 0,
        units,
        spent: cancelled ? 0 : order.total,
        firstOrder: order.createdAt,
        lastOrder: order.createdAt,
      });
    }
  }

  return [...rows.values()].sort((a, b) => b.spent - a.spent);
}

export function getCustomerSummary(orders: Order[], key: string): CustomerSummary | null {
  return aggregateCustomers(orders).find((customer) => customer.key === key) ?? null;
}
