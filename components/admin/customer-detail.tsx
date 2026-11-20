"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  ChevronRight,
  Copy,
  Download,
  Eye,
  ImageIcon,
  Mail,
  MapPin,
  Package,
  Phone,
  Search,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ORDER_STATUSES,
  OrderDetailDialog,
} from "@/components/admin/order-detail-dialog";
import { CATEGORY_LABELS } from "@/lib/data/catalog-meta";
import { aggregateCustomers, type CustomerSummary } from "@/lib/data/customers";
import { saveCsv } from "@/lib/csv";
import { formatDate, formatPrice } from "@/lib/format";
import { persistOrderStatus } from "@/lib/supabase/order-status";
import type { AdminProduct, Category, Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type OrderStatusFilter = "all" | OrderStatus;
type OrderSort = "newest" | "oldest" | "value";

type ProductIndex = {
  byId: Map<string, AdminProduct["product"]>;
  bySlug: Map<string, AdminProduct["product"]>;
  byName: Map<string, AdminProduct["product"]>;
};

type SoldProduct = {
  key: string;
  name: string;
  brand: string;
  image?: string;
  units: number;
  revenue: number;
};

type CategorySlice = {
  key: Category | "other";
  label: string;
  revenue: number;
  units: number;
  share: number;
};

const ORDER_STATUS_ITEMS: Record<OrderStatusFilter, string> = {
  all: "All statuses",
  ...(Object.fromEntries(ORDER_STATUSES.map((status) => [status, status])) as Record<
    OrderStatus,
    string
  >),
};
const ORDER_SORT_ITEMS: Record<OrderSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  value: "Highest value",
};
const ORDER_SORTS: OrderSort[] = ["newest", "oldest", "value"];

const STATUS_DOTS: Record<OrderStatus, string> = {
  pending: "bg-amber-500",
  processing: "bg-blue-500",
  shipped: "bg-violet-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
};

function orderTime(order: Order) {
  return new Date(order.createdAt).getTime();
}

function initialsOf(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "G";
}

function segmentOf(customer: CustomerSummary, activeOrders: number) {
  if (customer.spent >= 500 || activeOrders >= 3) {
    return {
      label: "VIP",
      className:
        "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400",
    };
  }
  if (customer.orders > 1) {
    return {
      label: "Repeat",
      className:
        "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    };
  }
  return {
    label: "New",
    className: "border-transparent bg-blue-500/10 text-blue-700 dark:text-blue-400",
  };
}

function indexProducts(products: AdminProduct[]): ProductIndex {
  return {
    byId: new Map(products.map((entry) => [entry.product.id, entry.product])),
    bySlug: new Map(products.map((entry) => [entry.product.slug, entry.product])),
    byName: new Map(products.map((entry) => [entry.product.name, entry.product])),
  };
}

function matchProduct(index: ProductIndex, line: Order["items"][number]) {
  return (
    index.byId.get(line.productId) ||
    (line.slug ? index.bySlug.get(line.slug) : undefined) ||
    index.byName.get(line.name)
  );
}

function Thumb({ src }: { src?: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
      {src ? (
        // Profiles mix local product photography with remote order images.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
      )}
    </span>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-2xl bg-muted/50 px-4 py-6 text-center text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function EmptyRow({ children, colSpan }: { children: React.ReactNode; colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

type CustomerDetailProps = {
  customer: CustomerSummary;
  initialOrders: Order[];
  products: AdminProduct[];
  ordersLive: boolean;
  canManage: boolean;
};

export function CustomerDetail({
  customer,
  initialOrders,
  products,
  ordersLive,
  canManage,
}: CustomerDetailProps) {
  const [orders, setOrders] = React.useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [orderQuery, setOrderQuery] = React.useState("");
  const [orderStatus, setOrderStatus] = React.useState<OrderStatusFilter>("all");
  const [orderSort, setOrderSort] = React.useState<OrderSort>("newest");

  const profile = React.useMemo(
    () => aggregateCustomers(orders)[0] ?? customer,
    [orders, customer]
  );
  const activeOrders = React.useMemo(
    () => orders.filter((order) => order.status !== "cancelled"),
    [orders]
  );
  const cancelledOrders = orders.length - activeOrders.length;
  const unitsBought = activeOrders.reduce(
    (sum, order) => sum + order.items.reduce((lineSum, line) => lineSum + line.quantity, 0),
    0
  );
  const averageOrder = activeOrders.length ? profile.spent / activeOrders.length : 0;
  const segment = segmentOf(profile, activeOrders.length);

  const productIndex = React.useMemo(() => indexProducts(products), [products]);

  const monthlySpend = React.useMemo(() => {
    const anchor = new Date(profile.lastOrder);
    if (!Number.isFinite(anchor.getTime())) return [];

    return Array.from({ length: 6 }, (_, index) => {
      const start = new Date(
        Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - (5 - index), 1)
      );
      const end = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)
      );
      const value = activeOrders
        .filter((order) => {
          const time = orderTime(order);
          return time >= start.getTime() && time < end.getTime();
        })
        .reduce((sum, order) => sum + order.total, 0);

      return {
        key: `${start.getUTCFullYear()}-${start.getUTCMonth()}`,
        label: start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
        year: start.getUTCFullYear(),
        value,
      };
    });
  }, [activeOrders, profile.lastOrder]);
  const maxMonthlySpend = Math.max(...monthlySpend.map((month) => month.value), 1);

  const soldProducts = React.useMemo(() => {
    const rows = new Map<string, SoldProduct>();

    for (const order of activeOrders) {
      for (const line of order.items) {
        const match = matchProduct(productIndex, line);
        const key = match?.id ?? line.name;
        const current = rows.get(key) ?? {
          key,
          name: match?.name ?? line.name,
          brand: match?.brand ?? line.brand,
          image: match?.images[0] ?? line.image,
          units: 0,
          revenue: 0,
        };

        current.units += line.quantity;
        current.revenue += line.price * line.quantity;
        rows.set(key, current);
      }
    }

    return [...rows.values()].sort((a, b) => b.revenue - a.revenue);
  }, [activeOrders, productIndex]);

  const topProducts = soldProducts.slice(0, 5);
  const bestRevenue = topProducts[0]?.revenue ?? 0;

  const categoryMix = React.useMemo(() => {
    const rows = new Map<Category | "other", { revenue: number; units: number }>();

    for (const order of activeOrders) {
      for (const line of order.items) {
        const match = matchProduct(productIndex, line);
        const key: Category | "other" = match?.category ?? "other";
        const current = rows.get(key) ?? { revenue: 0, units: 0 };
        current.revenue += line.price * line.quantity;
        current.units += line.quantity;
        rows.set(key, current);
      }
    }

    const total = [...rows.values()].reduce((sum, row) => sum + row.revenue, 0);
    return [...rows.entries()]
      .map(([key, row]) => ({
        key,
        label: key === "other" ? "Other" : CATEGORY_LABELS[key],
        revenue: row.revenue,
        units: row.units,
        share: total ? (row.revenue / total) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue) satisfies CategorySlice[];
  }, [activeOrders, productIndex]);

  const statusCounts = React.useMemo(
    () =>
      ORDER_STATUSES.map((status) => ({
        status,
        count: orders.filter((order) => order.status === status).length,
      })),
    [orders]
  );

  const filteredOrders = React.useMemo(() => {
    const query = orderQuery.trim().toLowerCase();
    const rows = orders.filter((order) => {
      if (orderStatus !== "all" && order.status !== orderStatus) return false;
      if (!query) return true;
      return [
        order.id,
        order.status,
        order.customer.fullName,
        order.customer.email,
        ...order.items.map((line) => line.name),
      ].some((value) => value?.toLowerCase().includes(query));
    });

    return rows.sort((a, b) => {
      if (orderSort === "value") return b.total - a.total;
      const delta = orderTime(a) - orderTime(b);
      return orderSort === "oldest" ? delta : -delta;
    });
  }, [orders, orderQuery, orderStatus, orderSort]);

  const fileKey =
    (profile.email || profile.name || profile.key)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 40) || "customer";

  function patchStatus(orderId: string, status: OrderStatus) {
    setOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status } : order))
    );
    setSelectedOrder((current) =>
      current && current.id === orderId ? { ...current, status } : current
    );
  }

  async function updateStatus(order: Order, status: OrderStatus) {
    if (!canManage) {
      toast.error("Admin access required", {
        description: "Ask an admin to enable profiles.is_admin for your account.",
      });
      return;
    }
    if (order.status === status) return;

    const previous = order.status;
    patchStatus(order.id, status);

    const result = await persistOrderStatus(order, status, ordersLive);

    if (result.mode === "local") {
      toast.success(`Order ${order.id} → ${status}`, {
        description: ordersLive
          ? "Demo order updated locally for this session."
          : "Demo mode — the change is kept in this session.",
      });
      return;
    }

    if (result.mode === "error") {
      patchStatus(order.id, previous);
      toast.error("Could not update order", { description: result.message });
      return;
    }

    toast.success(`Order ${order.id} → ${status}`);
  }

  async function copyEmail() {
    if (!profile.email) return;
    try {
      await navigator.clipboard.writeText(profile.email);
      toast.success("Email copied", { description: profile.email });
    } catch {
      toast.error("Could not copy the email address");
    }
  }

  function exportOrders() {
    if (!filteredOrders.length) {
      toast.error("There are no orders to export with the current filters.");
      return;
    }

    const header = [
      "Order",
      "Date",
      "Status",
      "Customer",
      "Email",
      "Items",
      "Units",
      "Subtotal",
      "Shipping",
      "Total",
    ];
    const rows = filteredOrders.map((order) => [
      order.id,
      order.createdAt,
      order.status,
      order.customer.fullName,
      order.customer.email,
      order.items.map((line) => `${line.quantity}x ${line.name} (${line.size})`).join("; "),
      order.items.reduce((sum, line) => sum + line.quantity, 0),
      order.subtotal,
      order.shipping,
      order.total,
    ]);

    saveCsv(`customer-${fileKey}-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      header,
      ...rows,
    ]);
    toast.success(`Exported ${filteredOrders.length} order${filteredOrders.length === 1 ? "" : "s"}`);
  }

  const kpis = [
    {
      label: "Lifetime spend",
      value: formatPrice(profile.spent),
      hint: `${activeOrders.length} valid order${activeOrders.length === 1 ? "" : "s"}`,
      icon: Wallet,
    },
    {
      label: "Orders",
      value: String(profile.orders),
      hint: cancelledOrders
        ? `${cancelledOrders} cancelled`
        : "No cancellations",
      icon: ShoppingBag,
    },
    {
      label: "Average order",
      value: formatPrice(Math.round(averageOrder)),
      hint: "Cancelled orders excluded",
      icon: TrendingUp,
    },
    {
      label: "Units bought",
      value: String(unitsBought),
      hint: `${soldProducts.length} unique product${soldProducts.length === 1 ? "" : "s"}`,
      icon: Boxes,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 pt-4 pb-24 sm:px-6 sm:pt-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href="/admin?tab=customers" />}
        >
          <ArrowLeft data-icon="inline-start" aria-hidden />
          All customers
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            {ordersLive ? "Live orders" : "Demo orders"}
          </Badge>
          {!canManage && (
            <Badge variant="outline" className="rounded-full">
              Read-only
            </Badge>
          )}
        </div>
      </div>

      <header className="rounded-3xl border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-foreground text-lg font-semibold text-background sm:size-16 sm:text-xl">
              {initialsOf(profile.name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                  {profile.name}
                </h1>
                <Badge variant="outline" className={cn("rounded-full", segment.className)}>
                  {segment.label}
                </Badge>
              </div>
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {profile.email || "No email on file"}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-foreground"
                  >
                    <Phone className="size-3.5" aria-hidden />
                    {profile.phone}
                  </a>
                )}
                {(profile.city || profile.country) && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" aria-hidden />
                    {[profile.city, profile.country].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" aria-hidden />
                  Customer since {formatDate(profile.firstOrder)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            {profile.email && (
              <Button
                variant="outline"
                size="sm"
                render={<a href={`mailto:${profile.email}`} />}
              >
                <Mail data-icon="inline-start" aria-hidden />
                Email
              </Button>
            )}
            {profile.email && (
              <Button variant="outline" size="sm" onClick={() => void copyEmail()}>
                <Copy data-icon="inline-start" aria-hidden />
                Copy
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={exportOrders}
              disabled={!filteredOrders.length}
              className="col-span-2 sm:col-span-1"
            >
              <Download data-icon="inline-start" aria-hidden />
              Export orders
            </Button>
          </div>
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        {kpis.map(({ label, value, hint, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardContent className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                  {label}
                </p>
                <p className="font-heading mt-1 truncate text-xl font-semibold sm:text-2xl">
                  {value}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground sm:text-[11px]">{hint}</p>
              </div>
              <span className="hidden size-8 shrink-0 items-center justify-center rounded-xl bg-muted sm:flex sm:size-10">
                <Icon className="size-4 sm:size-5" aria-hidden />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-heading text-lg font-semibold">Spend trend</h2>
                <p className="text-xs text-muted-foreground">
                  Six months ending with the latest order · cancelled orders excluded
                </p>
              </div>
              <Badge variant="outline" className="rounded-full">
                {formatPrice(profile.spent)} lifetime
              </Badge>
            </div>

            {monthlySpend.some((month) => month.value > 0) ? (
              <div
                className="flex h-44 items-end gap-1.5 sm:gap-2"
                role="img"
                aria-label={`Six month spend trend for ${profile.name}`}
              >
                {monthlySpend.map((month) => (
                  <div
                    key={month.key}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    <span className="w-full truncate text-center text-[9px] font-medium text-muted-foreground sm:text-[10px]">
                      {month.value ? formatPrice(month.value) : ""}
                    </span>
                    <div className="relative flex h-28 w-full items-end sm:h-32">
                      <div
                        className="w-full rounded-t-md bg-foreground/85 transition-colors hover:bg-foreground"
                        style={{
                          height: `${Math.max(3, (month.value / maxMonthlySpend) * 100)}%`,
                        }}
                        title={`${month.label} ${month.year}: ${formatPrice(month.value)}`}
                      />
                    </div>
                    <span className="w-full truncate text-center text-[9px] text-muted-foreground sm:text-[10px]">
                      {month.label}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyHint>No completed spend in the last six months.</EmptyHint>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h2 className="font-heading text-lg font-semibold">Customer details</h2>
              <p className="text-xs text-muted-foreground">Contact, delivery and order mix</p>
            </div>

            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Latest shipping address
              </p>
              <address className="mt-1.5 text-xs leading-relaxed text-muted-foreground not-italic">
                {profile.address || "No address on file"}
                <br />
                {[profile.city, profile.postalCode].filter(Boolean).join(", ") || "—"}
                <br />
                {profile.country || "—"}
              </address>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border p-2.5">
                <p className="text-[10px] text-muted-foreground">First order</p>
                <p className="mt-0.5 font-medium">{formatDate(profile.firstOrder)}</p>
              </div>
              <div className="rounded-xl border p-2.5">
                <p className="text-[10px] text-muted-foreground">Last order</p>
                <p className="mt-0.5 font-medium">{formatDate(profile.lastOrder)}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Order status mix
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {statusCounts.map(({ status, count }) => (
                  <div
                    key={status}
                    className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1.5 text-[11px]"
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOTS[status])} />
                    <span className="min-w-0 flex-1 truncate capitalize">{status}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-heading text-lg font-semibold">Top products</h2>
                <p className="text-xs text-muted-foreground">Ranked by revenue from this customer</p>
              </div>
              <Badge variant="outline" className="rounded-full">
                {soldProducts.length} product{soldProducts.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {topProducts.length ? (
              <ol className="flex flex-col gap-3">
                {topProducts.map((product, index) => (
                  <li key={product.key} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 text-[10px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <Thumb src={product.image} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {product.brand || "Unbranded"} · {product.units} unit
                        {product.units === 1 ? "" : "s"}
                      </p>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-foreground/80"
                          style={{
                            width: `${
                              bestRevenue
                                ? Math.max(4, (product.revenue / bestRevenue) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs font-semibold">{formatPrice(product.revenue)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyHint>No product purchases from non-cancelled orders yet.</EmptyHint>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h2 className="font-heading text-lg font-semibold">Category mix</h2>
              <p className="text-xs text-muted-foreground">What this customer buys most</p>
            </div>

            {categoryMix.length ? (
              <ul className="flex flex-col gap-3">
                {categoryMix.map((slice) => (
                  <li key={slice.key}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium">{slice.label}</span>
                      <span className="font-semibold">{formatPrice(slice.revenue)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-foreground/80"
                        style={{ width: `${Math.max(3, slice.share)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {slice.units} unit{slice.units === 1 ? "" : "s"} · {Math.round(slice.share)}% of
                      spend
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint>Category preferences appear after the first completed order.</EmptyHint>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-heading text-lg font-semibold">Order history</h2>
              <p className="text-xs text-muted-foreground">
                {profile.orders} order{profile.orders === 1 ? "" : "s"} · {formatPrice(profile.spent)}{" "}
                lifetime spend
              </p>
            </div>
            <Badge variant="outline" className="rounded-full">
              {filteredOrders.length} shown
            </Badge>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full sm:min-w-52 sm:max-w-sm sm:flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={orderQuery}
                onChange={(event) => setOrderQuery(event.target.value)}
                placeholder="Search order, item, status…"
                className="pl-9"
                aria-label="Search customer orders"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Select
                items={ORDER_STATUS_ITEMS}
                value={orderStatus}
                onValueChange={(value) => setOrderStatus(value as OrderStatusFilter)}
              >
                <SelectTrigger className="w-full capitalize sm:w-36" aria-label="Filter customer orders">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status} className="capitalize">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                items={ORDER_SORT_ITEMS}
                value={orderSort}
                onValueChange={(value) => setOrderSort(value as OrderSort)}
              >
                <SelectTrigger className="w-full sm:w-36" aria-label="Sort customer orders">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {ORDER_SORTS.map((sort) => (
                    <SelectItem key={sort} value={sort}>
                      {ORDER_SORT_ITEMS[sort]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile order cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {filteredOrders.map((order) => {
              const units = order.items.reduce((sum, line) => sum + line.quantity, 0);
              return (
                <li key={order.id} className="rounded-2xl border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="font-mono text-xs font-medium underline-offset-4 hover:underline"
                      onClick={() => setSelectedOrder(order)}
                    >
                      {order.id}
                    </button>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-col gap-1">
                    {order.items.slice(0, 2).map((line) => (
                      <p key={line.key} className="truncate text-xs">
                        <span className="text-muted-foreground">{line.quantity}×</span> {line.name}
                        {line.size ? (
                          <span className="text-muted-foreground"> · {line.size}</span>
                        ) : null}
                      </p>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-[10px] text-muted-foreground">
                        +{order.items.length - 2} more line
                        {order.items.length - 2 === 1 ? "" : "s"}
                      </p>
                    )}
                    {!order.items.length && (
                      <p className="text-xs text-muted-foreground">No items recorded</p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <Select
                      items={Object.fromEntries(
                        ORDER_STATUSES.map((status) => [status, status])
                      )}
                      value={order.status}
                      onValueChange={(value) => {
                        if (value) void updateStatus(order, value as OrderStatus);
                      }}
                      disabled={!canManage}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-32 capitalize"
                        aria-label={`Status for order ${order.id}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        {ORDER_STATUSES.map((status) => (
                          <SelectItem key={status} value={status} className="capitalize">
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="ml-auto flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatPrice(order.total)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {units} unit{units === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                        aria-label={`View order ${order.id}`}
                      >
                        <Eye data-icon="inline-start" aria-hidden />
                        Details
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
            {!filteredOrders.length && (
              <li className="rounded-2xl border px-4 py-10 text-center text-sm text-muted-foreground">
                No orders match those filters.
              </li>
            )}
          </ul>

          {/* Desktop order table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-36">Status</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">View</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const units = order.items.reduce((sum, line) => sum + line.quantity, 0);
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <button
                          type="button"
                          className="font-mono text-xs font-medium underline-offset-4 hover:underline"
                          onClick={() => setSelectedOrder(order)}
                        >
                          {order.id}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(order.createdAt)}</TableCell>
                      <TableCell>
                        <span className="text-xs">
                          {order.items
                            .slice(0, 2)
                            .map((line) => `${line.quantity}× ${line.name}`)
                            .join(", ") || "—"}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {units} unit{units === 1 ? "" : "s"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {formatPrice(order.total)}
                      </TableCell>
                      <TableCell>
                        <Select
                          items={Object.fromEntries(
                            ORDER_STATUSES.map((status) => [status, status])
                          )}
                          value={order.status}
                          onValueChange={(value) => {
                            if (value) void updateStatus(order, value as OrderStatus);
                          }}
                          disabled={!canManage}
                        >
                          <SelectTrigger
                            size="sm"
                            className="w-full capitalize"
                            aria-label={`Status for order ${order.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent align="end">
                            {ORDER_STATUSES.map((status) => (
                              <SelectItem key={status} value={status} className="capitalize">
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setSelectedOrder(order)}
                          aria-label={`View order ${order.id}`}
                        >
                          <Eye aria-hidden />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!filteredOrders.length && (
                  <EmptyRow colSpan={6}>No orders match those filters.</EmptyRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Package className="size-3.5" aria-hidden />
          {profile.name} · {profile.email || "no email"}
        </span>
        <Button
          variant="ghost"
          size="xs"
          render={<Link href="/admin?tab=customers" />}
        >
          Back to all customers
          <ChevronRight data-icon="inline-end" aria-hidden />
        </Button>
      </div>

      {selectedOrder && (
        <OrderDetailDialog
          order={selectedOrder}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedOrder(null);
          }}
          canManage={canManage}
          onChangeStatus={(order, status) => void updateStatus(order, status)}
        />
      )}
    </div>
  );
}
