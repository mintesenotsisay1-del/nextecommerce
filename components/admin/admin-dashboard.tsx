"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  ChevronRight,
  Copy,
  DollarSign,
  Download,
  Eye,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InsightsPanel } from "@/components/admin/insights-panel";
import { ORDER_STATUSES, OrderDetailDialog } from "@/components/admin/order-detail-dialog";
import { ProductFormDialog } from "@/components/admin/product-form-dialog";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/data/catalog-meta";
import {
  aggregateCustomers,
  customerHref,
  type CustomerSummary,
} from "@/lib/data/customers";
import { totalStock } from "@/lib/data/products";
import { saveCsv } from "@/lib/csv";
import { discountPercent, formatDate, formatPrice } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { persistOrderStatus } from "@/lib/supabase/order-status";
import type { AdminProduct, AdminStats, Category, Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

type Health = "healthy" | "low" | "critical";
type OrderStatusFilter = "all" | OrderStatus;
type OrderSort = "newest" | "oldest" | "value";
type CategoryFilter = "all" | Category;
type HealthFilter = "all" | Health;
type InventorySort = "stock" | "name" | "price";
type RangeKey = "7d" | "30d" | "90d";

type FormState = {
  product: AdminProduct | null;
  duplicate: boolean;
};

const STATUS_ITEMS: Record<OrderStatusFilter, string> = {
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
const CATEGORY_ITEMS: Record<CategoryFilter, string> = {
  all: "All categories",
  ...CATEGORY_LABELS,
};
const HEALTH_ITEMS: Record<HealthFilter, string> = {
  all: "All stock",
  healthy: "Healthy",
  low: "Low stock",
  critical: "Out of stock",
};
const SORT_ITEMS: Record<InventorySort, string> = {
  stock: "Stock: low first",
  name: "Name: A–Z",
  price: "Price: high first",
};
const RANGE_DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90 };
const RANGE_ITEMS: Record<RangeKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

const CATEGORY_FILTERS: CategoryFilter[] = ["all", ...CATEGORY_ORDER];
const ORDER_SORTS: OrderSort[] = ["newest", "oldest", "value"];
const INVENTORY_SORTS: InventorySort[] = ["stock", "name", "price"];
const HEALTH_FILTERS: HealthFilter[] = ["all", "healthy", "low", "critical"];

function productHealth(stock: number): Health {
  if (stock === 0) return "critical";
  if (stock < 15) return "low";
  return "healthy";
}

function orderTime(order: Order) {
  return new Date(order.createdAt).getTime();
}

function summarize(orders: Order[]): AdminStats {
  const valid = orders.filter((order) => order.status !== "cancelled");
  const revenue = valid.reduce((sum, order) => sum + order.total, 0);
  return {
    revenue,
    orders: orders.length,
    avgOrderValue: valid.length ? revenue / valid.length : 0,
    unitsSold: valid.reduce(
      (sum, order) => sum + order.items.reduce((units, line) => units + line.quantity, 0),
      0
    ),
  };
}

function metricChange(current: number, previous: number) {
  if (previous <= 0) {
    return { label: current > 0 ? "New" : "0%", up: current >= 0 };
  }
  const percent = ((current - previous) / previous) * 100;
  return {
    label: `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`,
    up: percent >= 0,
  };
}

function downloadOrdersCsv(orders: Order[]) {
  if (!orders.length) {
    toast.error("There are no orders to export with the current filters.");
    return;
  }

  const header = [
    "Order",
    "Date",
    "Status",
    "Customer",
    "Email",
    "Phone",
    "Address",
    "City",
    "Postal code",
    "Country",
    "Items",
    "Units",
    "Subtotal",
    "Shipping",
    "Total",
  ];
  const rows = orders.map((order) => [
    order.id,
    order.createdAt,
    order.status,
    order.customer.fullName,
    order.customer.email,
    order.customer.phone,
    order.customer.address,
    order.customer.city,
    order.customer.postalCode,
    order.customer.country,
    order.items.map((line) => `${line.quantity}x ${line.name} (${line.size})`).join("; "),
    order.items.reduce((sum, line) => sum + line.quantity, 0),
    order.subtotal,
    order.shipping,
    order.total,
  ]);
  saveCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  toast.success(`Exported ${orders.length} order${orders.length === 1 ? "" : "s"}`);
}

function downloadInventoryCsv(products: AdminProduct[]) {
  if (!products.length) {
    toast.error("There are no products to export with the current filters.");
    return;
  }

  const header = [
    "Product",
    "Slug",
    "Brand",
    "Category",
    "Price",
    "Compare at",
    "Stock",
    "Sizes",
    "Tags",
    "Source",
  ];
  const rows = products.map(({ product, sourceId }) => [
    product.name,
    product.slug,
    product.brand,
    CATEGORY_LABELS[product.category],
    product.price,
    product.compareAtPrice ?? "",
    totalStock(product),
    product.sizes.map((size) => `${size.size}: ${size.stock}`).join("; "),
    product.tags.join("; "),
    sourceId ? "Supabase" : "Local demo",
  ]);
  saveCsv(`inventory-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  toast.success(`Exported ${products.length} product${products.length === 1 ? "" : "s"}`);
}

function ProductThumb({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted",
        className
      )}
    >
      {src ? (
        // Catalogue images can be local files or admin-entered URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
      )}
    </span>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="font-heading mt-1 text-xl font-semibold sm:text-2xl">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function HealthBadge({ health }: { health: Health }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full text-[10px] capitalize",
        health === "healthy" && "border-transparent bg-emerald-500/10 text-emerald-700",
        health === "low" && "border-transparent bg-amber-500/10 text-amber-700",
        health === "critical" && "border-transparent bg-red-500/10 text-red-700"
      )}
    >
      {health}
    </Badge>
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

type AdminDashboardProps = {
  orders: Order[];
  ordersLive: boolean;
  products: AdminProduct[];
  canManage: boolean;
  /** Request timestamp used to anchor relative date ranges without render-time clocks. */
  generatedAt: string;
  /** Opens a specific workspace tab, e.g. when returning from a customer profile. */
  initialTab?: "orders" | "inventory" | "customers" | "insights";
};

export function AdminDashboard({
  orders: initialOrders,
  ordersLive,
  products: initialProducts,
  canManage,
  generatedAt,
  initialTab = "orders",
}: AdminDashboardProps) {
  const [orders, setOrders] = React.useState(initialOrders);
  const [products, setProducts] = React.useState(initialProducts);
  const [tab, setTab] = React.useState(initialTab);

  const [range, setRange] = React.useState<RangeKey>("30d");
  const [orderQuery, setOrderQuery] = React.useState("");
  const [orderStatus, setOrderStatus] = React.useState<OrderStatusFilter>("all");
  const [orderSort, setOrderSort] = React.useState<OrderSort>("newest");
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);

  const [inventoryQuery, setInventoryQuery] = React.useState("");
  const [inventoryCategory, setInventoryCategory] = React.useState<CategoryFilter>("all");
  const [inventoryHealth, setInventoryHealth] = React.useState<HealthFilter>("all");
  const [inventorySort, setInventorySort] = React.useState<InventorySort>("stock");

  const [customerQuery, setCustomerQuery] = React.useState("");
  const [formState, setFormState] = React.useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const rangeDays = RANGE_DAYS[range];
  const rangeLabel = RANGE_ITEMS[range];
  const anchor = React.useMemo(() => {
    const time = new Date(generatedAt).getTime();
    return Number.isFinite(time) ? time : 0;
  }, [generatedAt]);
  const rangeStart = anchor - rangeDays * DAY_MS;
  const previousStart = rangeStart - rangeDays * DAY_MS;

  const rangeOrders = React.useMemo(
    () =>
      orders.filter((order) => {
        const time = orderTime(order);
        return time >= rangeStart && time <= anchor;
      }),
    [orders, rangeStart, anchor]
  );
  const previousOrders = React.useMemo(
    () =>
      orders.filter((order) => {
        const time = orderTime(order);
        return time >= previousStart && time < rangeStart;
      }),
    [orders, previousStart, rangeStart]
  );

  const rangeStats = React.useMemo(() => summarize(rangeOrders), [rangeOrders]);
  const previousStats = React.useMemo(() => summarize(previousOrders), [previousOrders]);

  const chartUsesSample = !ordersLive && rangeStats.revenue === 0;
  const chart = React.useMemo(() => {
    const bucketDays = rangeDays <= 7 ? 1 : rangeDays <= 30 ? 5 : 7;
    const bucketMs = bucketDays * DAY_MS;
    const count = Math.ceil(rangeDays / bucketDays);
    const validOrders = orders.filter((order) => order.status !== "cancelled");

    return Array.from({ length: count }, (_, index) => {
      const start = rangeStart + index * bucketMs;
      const end = Math.min(start + bucketMs, anchor + 1);
      const value = validOrders
        .filter((order) => {
          const time = orderTime(order);
          return time >= start && time < end;
        })
        .reduce((sum, order) => sum + order.total, 0);
      const startDate = new Date(start);
      const endDate = new Date(Math.max(start, end - 1));
      const label =
        bucketDays === 1
          ? startDate.toLocaleDateString("en-US", {
              weekday: "short",
              timeZone: "UTC",
            })
          : startDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            });
      const full =
        bucketDays === 1
          ? startDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })
          : `${label} – ${endDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })}`;

      return {
        label,
        full,
        value: chartUsesSample
          ? Math.round(Math.max(0, 40 + Math.sin(index * 1.7) * 80))
          : value,
      };
    });
  }, [orders, rangeDays, rangeStart, anchor, chartUsesSample]);

  const maxRevenue = Math.max(...chart.map((bucket) => bucket.value), 1);
  const peak = chart.reduce(
    (best, bucket) => (bucket.value > best.value ? bucket : best),
    chart[0]
  );

  const filteredOrders = React.useMemo(() => {
    const query = orderQuery.trim().toLowerCase();
    const rows = orders.filter((order) => {
      if (orderStatus !== "all" && order.status !== orderStatus) return false;
      if (!query) return true;
      return [
        order.id,
        order.customer.fullName,
        order.customer.email,
        order.customer.phone,
        order.customer.city,
      ].some((value) => value?.toLowerCase().includes(query));
    });

    return rows.sort((a, b) => {
      if (orderSort === "value") return b.total - a.total;
      const delta = orderTime(a) - orderTime(b);
      return orderSort === "oldest" ? delta : -delta;
    });
  }, [orders, orderQuery, orderStatus, orderSort]);

  const catalogueStats = React.useMemo(() => {
    let units = 0;
    let low = 0;
    let out = 0;
    let value = 0;
    let local = 0;

    for (const entry of products) {
      const stock = totalStock(entry.product);
      units += stock;
      value += entry.product.price * stock;
      if (stock === 0) out += 1;
      else if (stock < 15) low += 1;
      if (!entry.sourceId) local += 1;
    }

    return { units, low, out, value, local };
  }, [products]);

  const filteredProducts = React.useMemo(() => {
    const query = inventoryQuery.trim().toLowerCase();
    const rows = products.filter((entry) => {
      const product = entry.product;
      if (inventoryCategory !== "all" && product.category !== inventoryCategory) return false;
      if (inventoryHealth !== "all" && productHealth(totalStock(product)) !== inventoryHealth) {
        return false;
      }
      if (!query) return true;
      return [product.name, product.brand, product.slug, product.color].some((value) =>
        value.toLowerCase().includes(query)
      );
    });

    return rows.sort((a, b) => {
      if (inventorySort === "name") return a.product.name.localeCompare(b.product.name);
      if (inventorySort === "price") return b.product.price - a.product.price;
      return totalStock(a.product) - totalStock(b.product);
    });
  }, [products, inventoryQuery, inventoryCategory, inventoryHealth, inventorySort]);

  const customers = React.useMemo(() => aggregateCustomers(orders), [orders]);
  const filteredCustomers = React.useMemo(() => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.city].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [customers, customerQuery]);

  const repeatCustomers = customers.filter((customer) => customer.orders > 1).length;
  const customerSpend = customers.reduce((sum, customer) => sum + customer.spent, 0);

  async function updateStatus(order: Order, status: OrderStatus) {
    if (!canManage) {
      toast.error("Admin access required", {
        description: "Ask an admin to enable profiles.is_admin for your account.",
      });
      return;
    }
    if (order.status === status) return;

    const previous = order.status;
    const patch = (value: OrderStatus) => {
      setOrders((current) =>
        current.map((item) => (item.id === order.id ? { ...item, status: value } : item))
      );
      setSelectedOrder((current) =>
        current && current.id === order.id ? { ...current, status: value } : current
      );
    };

    patch(status);

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
      patch(previous);
      toast.error("Could not update order", { description: result.message });
      return;
    }

    toast.success(`Order ${order.id} → ${status}`);
  }

  function openCreate() {
    setFormState({ product: null, duplicate: false });
    setTab("inventory");
  }

  function openEdit(entry: AdminProduct) {
    setFormState({ product: entry, duplicate: false });
    setTab("inventory");
  }

  function openDuplicate(entry: AdminProduct) {
    setFormState({
      duplicate: true,
      product: {
        sourceId: null,
        product: {
          ...entry.product,
          id: `${entry.product.id}_copy`,
          name: `${entry.product.name} (copy)`,
          slug: `${entry.product.slug}-copy`,
        },
      },
    });
    setTab("inventory");
  }

  function handleProductSaved(entry: AdminProduct, mode: "created" | "updated") {
    const originalId =
      formState && !formState.duplicate ? formState.product?.product.id : undefined;

    setProducts((current) => {
      const next = current.filter((item) => {
        if (originalId && item.product.id === originalId) return false;
        if (item.product.slug === entry.product.slug) return false;
        if (entry.sourceId && item.sourceId === entry.sourceId) return false;
        return true;
      });
      return [...next, entry];
    });

    if (mode === "created") setTab("inventory");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (!canManage) {
      toast.error("Admin access required");
      return;
    }

    setDeleting(true);
    try {
      if (isSupabaseConfigured() && deleteTarget.sourceId) {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) throw new Error("Supabase client is not available.");
        const { data, error } = await supabase
          .from("products")
          .delete()
          .eq("id", deleteTarget.sourceId)
          .select("id");
        if (error) throw new Error(error.message);
        if (!data?.length) {
          throw new Error(
            "Supabase blocked the delete. Check that your account is an admin and try again."
          );
        }
        toast.success("Product deleted", {
          description: "The Supabase row and all linked wishlist/review data were removed.",
        });
      } else {
        toast.success("Product removed", {
          description: isSupabaseConfigured()
            ? "This is a local demo product — there was no Supabase row to delete."
            : "Demo mode — the product was removed for this session.",
        });
      }

      setProducts((current) =>
        current.filter(
          (entry) =>
            entry.product.id !== deleteTarget.product.id &&
            (!deleteTarget.sourceId || entry.sourceId !== deleteTarget.sourceId)
        )
      );
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Could not delete product", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDeleting(false);
    }
  }

  function viewCustomerOrders(customer: CustomerSummary) {
    setOrderQuery(customer.email || customer.name);
    setOrderStatus("all");
    setOrderSort("newest");
    setTab("orders");
  }

  function viewStatusOrders(status: OrderStatus) {
    setOrderQuery("");
    setOrderStatus(status);
    setOrderSort("newest");
    setTab("orders");
  }

  const kpis = [
    {
      label: "Revenue",
      value: formatPrice(rangeStats.revenue),
      icon: DollarSign,
      change: metricChange(rangeStats.revenue, previousStats.revenue),
    },
    {
      label: "Orders",
      value: String(rangeStats.orders),
      icon: ShoppingBag,
      change: metricChange(rangeStats.orders, previousStats.orders),
    },
    {
      label: "Units sold",
      value: String(rangeStats.unitsSold),
      icon: Boxes,
      change: metricChange(rangeStats.unitsSold, previousStats.unitsSold),
    },
    {
      label: "Avg order value",
      value: formatPrice(Math.round(rangeStats.avgOrderValue)),
      icon: TrendingUp,
      change: metricChange(rangeStats.avgOrderValue, previousStats.avgOrderValue),
    },
  ];

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* Workspace actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-xs text-muted-foreground">
          {canManage
            ? "Create and edit products, move orders through fulfilment and export the data your team needs."
            : "You have read-only access. Sign in with an admin account to create products and update orders."}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button
            variant="outline"
            onClick={() => downloadOrdersCsv(filteredOrders)}
            disabled={!filteredOrders.length}
            title="Export the orders matching the current search and status filters"
            className="w-full sm:w-auto"
          >
            <Download data-icon="inline-start" aria-hidden />
            Export orders
          </Button>
          <Button onClick={openCreate} disabled={!canManage} className="w-full sm:w-auto">
            <Plus data-icon="inline-start" aria-hidden />
            Add product
          </Button>
        </div>
      </div>

      {/* Performance header + KPIs */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-semibold">Performance</h2>
            <p className="text-xs text-muted-foreground">
              {rangeLabel} · compared with the previous {rangeDays} days
            </p>
          </div>
          <Select
            items={RANGE_ITEMS}
            value={range}
            onValueChange={(value) => setRange(value as RangeKey)}
          >
            <SelectTrigger size="sm" className="w-36" aria-label="Analytics period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {(Object.keys(RANGE_ITEMS) as RangeKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {RANGE_ITEMS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, change }) => (
            <Card key={label} size="sm">
              <CardContent className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                    {label}
                  </p>
                  <p className="font-heading mt-1 truncate text-xl font-semibold sm:text-2xl">
                    {value}
                  </p>
                  <p
                    className={cn(
                      "mt-1 flex flex-wrap items-center gap-1 text-[10px] font-medium sm:text-[11px]",
                      change.up ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    {change.label !== "New" &&
                      (change.up ? (
                        <ArrowUp className="size-3" aria-hidden />
                      ) : (
                        <ArrowDown className="size-3" aria-hidden />
                      ))}
                    {change.label}
                    <span className="font-normal text-muted-foreground">
                      vs previous {rangeDays}d
                    </span>
                  </p>
                </div>
                <span className="hidden size-8 shrink-0 items-center justify-center rounded-xl bg-muted sm:flex sm:size-10">
                  <Icon className="size-4 sm:size-5" aria-hidden />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Revenue chart */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-heading text-lg font-semibold">Revenue trend</h2>
              <p className="text-xs text-muted-foreground">
                {rangeLabel} ·{" "}
                {ordersLive
                  ? "live orders"
                  : chartUsesSample
                    ? "sample trend (no demo orders in this period)"
                    : "demo orders"}
              </p>
            </div>
            <Badge variant="outline" className="rounded-full">
              {peak.value > 0 ? `Peak ${formatPrice(peak.value)}` : "No revenue yet"}
            </Badge>
          </div>

          <div
            className="flex h-44 items-end gap-1 sm:gap-2"
            role="img"
            aria-label={`Revenue trend for ${rangeLabel.toLowerCase()}`}
          >
            {chart.map((bucket, index) => (
              <div
                key={`${bucket.full}-${index}`}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
              >
                <span
                  className={cn(
                    "w-full truncate text-center text-[9px] font-medium text-muted-foreground sm:text-[10px]",
                    chart.length > 8 && "hidden sm:block"
                  )}
                >
                  {bucket.value > 0 ? formatPrice(bucket.value) : ""}
                </span>
                <div className="relative flex h-28 w-full items-end sm:h-32">
                  <div
                    className="w-full rounded-t-md bg-foreground/85 transition-colors hover:bg-foreground"
                    style={{ height: `${Math.max(3, (bucket.value / maxRevenue) * 100)}%` }}
                    title={`${bucket.full}: ${formatValue(bucket.value)}`}
                  />
                </div>
                <span
                  className={cn(
                    "w-full truncate text-center text-[9px] text-muted-foreground sm:text-[10px]",
                    chart.length > 8 && index % 2 === 1 && "invisible sm:visible"
                  )}
                >
                  {bucket.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Operations */}
      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="orders" className="shrink-0">
            Orders <span className="text-[10px] text-muted-foreground">{orders.length}</span>
          </TabsTrigger>
          <TabsTrigger value="inventory" className="shrink-0">
            Inventory <span className="text-[10px] text-muted-foreground">{products.length}</span>
          </TabsTrigger>
          <TabsTrigger value="customers" className="shrink-0">
            Customers <span className="text-[10px] text-muted-foreground">{customers.length}</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="shrink-0">
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative w-full sm:min-w-52 sm:max-w-sm sm:flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    value={orderQuery}
                    onChange={(event) => setOrderQuery(event.target.value)}
                    placeholder="Search order, customer, email…"
                    className="pl-9"
                    aria-label="Search orders"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <Select
                    items={STATUS_ITEMS}
                    value={orderStatus}
                    onValueChange={(value) => setOrderStatus(value as OrderStatusFilter)}
                  >
                    <SelectTrigger className="w-full capitalize sm:w-36" aria-label="Filter by order status">
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
                    <SelectTrigger className="w-full sm:w-36" aria-label="Sort orders">
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
                  <Badge
                    variant="outline"
                    className="col-span-2 justify-self-start rounded-full sm:col-span-1"
                  >
                    {filteredOrders.length} of {orders.length}
                  </Badge>
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
                      <div className="mt-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {order.customer.fullName || "Guest"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {order.customer.email || order.customer.city || "No contact details"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold">{formatPrice(order.total)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {units} unit{units === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      <p className="mt-1.5 truncate text-xs text-muted-foreground">
                        {order.items
                          .map((line) => `${line.quantity}× ${line.name}`)
                          .join(", ") || "No items recorded"}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
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
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-36">Status</TableHead>
                      <TableHead className="w-12 text-right">
                        <span className="sr-only">View</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
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
                          <span className="text-xs font-medium">
                            {order.customer.fullName || "Guest"}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {order.customer.email || order.customer.city || "No contact details"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">
                            {order.items
                              .slice(0, 2)
                              .map((line) => `${line.quantity}× ${line.name.slice(0, 18)}…`)
                              .join(", ") || "—"}
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
                              aria-label="Order status"
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
                    ))}
                    {!filteredOrders.length && (
                      <EmptyRow colSpan={7}>No orders match those filters.</EmptyRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MiniStat
                label="Catalogue"
                value={String(products.length)}
                hint={`${products.length - catalogueStats.local} live · ${catalogueStats.local} local demo`}
              />
              <MiniStat
                label="Units in stock"
                value={String(catalogueStats.units)}
                hint="Ready to sell across every size"
              />
              <MiniStat
                label="Needs attention"
                value={String(catalogueStats.low + catalogueStats.out)}
                hint={`${catalogueStats.low} low · ${catalogueStats.out} out of stock`}
              />
              <MiniStat
                label="Inventory value"
                value={formatPrice(catalogueStats.value)}
                hint="At current retail prices"
              />
            </div>

            <Card>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <div className="relative w-full sm:max-w-xs">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      value={inventoryQuery}
                      onChange={(event) => setInventoryQuery(event.target.value)}
                      placeholder="Search product, brand, slug…"
                      className="pl-9"
                      aria-label="Search inventory"
                    />
                  </div>
                  {/* Filter + action row — 2-col on mobile, single row from sm */}
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                    <Select
                      items={CATEGORY_ITEMS}
                      value={inventoryCategory}
                      onValueChange={(value) => setInventoryCategory(value as CategoryFilter)}
                    >
                      <SelectTrigger className="w-full sm:w-36" aria-label="Filter by category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_FILTERS.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category === "all" ? "All categories" : CATEGORY_LABELS[category]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      items={HEALTH_ITEMS}
                      value={inventoryHealth}
                      onValueChange={(value) => setInventoryHealth(value as HealthFilter)}
                    >
                      <SelectTrigger className="w-full sm:w-32" aria-label="Filter by stock health">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HEALTH_FILTERS.map((health) => (
                          <SelectItem key={health} value={health} className="capitalize">
                            {HEALTH_ITEMS[health]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      items={SORT_ITEMS}
                      value={inventorySort}
                      onValueChange={(value) => setInventorySort(value as InventorySort)}
                    >
                      <SelectTrigger
                        className="w-full sm:w-40"
                        aria-label="Sort inventory"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="end">
                        {INVENTORY_SORTS.map((sort) => (
                          <SelectItem key={sort} value={sort}>
                            {SORT_ITEMS[sort]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 sm:ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadInventoryCsv(filteredProducts)}
                        disabled={!filteredProducts.length}
                        className="flex-1 sm:flex-none"
                      >
                        <Download data-icon="inline-start" aria-hidden />
                        Export
                      </Button>
                      <Button
                        onClick={openCreate}
                        disabled={!canManage}
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        <Plus data-icon="inline-start" aria-hidden />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Mobile + tablet inventory cards (< lg) */}
                <ul className="grid gap-2 sm:grid-cols-2 lg:hidden">
                  {filteredProducts.map((entry) => {
                    const product = entry.product;
                    const stock = totalStock(product);
                    const health = productHealth(stock);
                    const discount = discountPercent(product.price, product.compareAtPrice);
                    const soldOutSizes = product.sizes.filter((size) => size.stock === 0).length;

                    return (
                      <li
                        key={`${entry.sourceId ?? "local"}-${product.id}`}
                        className="flex flex-col rounded-2xl border p-3"
                      >
                        {/* Top: image + info */}
                        <div className="flex items-start gap-3">
                          <ProductThumb
                            src={product.images[0]}
                            alt={product.name}
                            className="size-12 shrink-0 rounded-xl sm:size-14"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-1.5">
                              <p className="line-clamp-2 text-sm font-medium leading-snug">
                                {product.name}
                              </p>
                              <HealthBadge health={health} />
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {product.brand} · {CATEGORY_LABELS[product.category]}
                            </p>
                            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/70">
                              {product.slug}
                            </p>
                          </div>
                        </div>

                        {/* Middle: price + stock */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="font-semibold">{formatPrice(product.price)}</span>
                          {discount && (
                            <span className="text-[10px] text-red-600">−{discount}%</span>
                          )}
                          <span className="text-muted-foreground">
                            {stock === 0 ? "Out of stock" : `${stock} in stock`}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {soldOutSizes > 0 ? `${soldOutSizes} size${soldOutSizes === 1 ? "" : "s"} out` : "All sizes stocked"}
                          </span>
                        </div>

                        {/* Tags */}
                        {(product.tags.length > 0 || !entry.sourceId) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {!entry.sourceId && (
                              <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[9px]">
                                local demo
                              </Badge>
                            )}
                            {product.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="rounded-full px-1.5 py-0 text-[9px] capitalize">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Actions — pushed to bottom */}
                        <div className="mt-auto flex items-center justify-end gap-0.5 border-t pt-2.5 mt-2.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(entry)}
                            disabled={!canManage}
                            aria-label={`Edit ${product.name}`}
                            className="h-8 px-2 text-xs"
                          >
                            <Pencil className="size-3.5" aria-hidden />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openDuplicate(entry)}
                            disabled={!canManage}
                            aria-label={`Duplicate ${product.name}`}
                          >
                            <Copy aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(entry)}
                            disabled={!canManage}
                            aria-label={`Delete ${product.name}`}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                  {!filteredProducts.length && (
                    <li className="col-span-2 rounded-2xl border px-4 py-10 text-center text-sm text-muted-foreground">
                      No products match those filters.
                    </li>
                  )}
                </ul>

                {/* Desktop inventory table */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="w-24 text-right">Health</TableHead>
                        <TableHead className="w-28 text-right">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((entry) => {
                        const product = entry.product;
                        const stock = totalStock(product);
                        const health = productHealth(stock);
                        const discount = discountPercent(product.price, product.compareAtPrice);
                        const soldOutSizes = product.sizes.filter(
                          (size) => size.stock === 0
                        ).length;

                        return (
                          <TableRow key={`${entry.sourceId ?? "local"}-${product.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <ProductThumb src={product.images[0]} alt={product.name} />
                                <div className="min-w-0">
                                  <p className="max-w-64 truncate text-xs font-medium">
                                    {product.name}
                                  </p>
                                  <p className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <span className="font-mono">{product.slug}</span>
                                    {!entry.sourceId && (
                                      <Badge
                                        variant="outline"
                                        className="rounded-full px-1.5 py-0 text-[9px]"
                                      >
                                        local demo
                                      </Badge>
                                    )}
                                    {product.tags.map((tag) => (
                                      <Badge
                                        key={tag}
                                        variant="secondary"
                                        className="rounded-full px-1.5 py-0 text-[9px] capitalize"
                                      >
                                        {tag}
                                      </Badge>
                                    ))}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{product.brand}</TableCell>
                            <TableCell className="text-xs">
                              {formatPrice(product.price)}
                              {discount && (
                                <span className="ml-1 text-[10px] text-red-600">−{discount}%</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold">
                              {stock}
                              <span className="block text-[10px] font-normal text-muted-foreground">
                                {soldOutSizes} sold out
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <HealthBadge health={health} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openEdit(entry)}
                                  disabled={!canManage}
                                  aria-label={`Edit ${product.name}`}
                                  title="Edit"
                                >
                                  <Pencil aria-hidden />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openDuplicate(entry)}
                                  disabled={!canManage}
                                  aria-label={`Duplicate ${product.name}`}
                                  title="Duplicate"
                                >
                                  <Copy aria-hidden />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setDeleteTarget(entry)}
                                  disabled={!canManage}
                                  aria-label={`Delete ${product.name}`}
                                  title="Delete"
                                >
                                  <Trash2 aria-hidden />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!filteredProducts.length && (
                        <EmptyRow colSpan={6}>No products match those filters.</EmptyRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat
                label="Customers"
                value={String(customers.length)}
                hint="Unique customers in this order set"
              />
              <MiniStat
                label="Repeat customers"
                value={String(repeatCustomers)}
                hint="More than one order"
              />
              <MiniStat
                label="Average spend"
                value={formatPrice(customers.length ? Math.round(customerSpend / customers.length) : 0)}
                hint="Excludes cancelled orders"
              />
            </div>

            <Card>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:min-w-52 sm:max-w-sm sm:flex-1">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      value={customerQuery}
                      onChange={(event) => setCustomerQuery(event.target.value)}
                      placeholder="Search name, email or city…"
                      className="pl-9"
                      aria-label="Search customers"
                    />
                  </div>
                  <Badge variant="outline" className="rounded-full">
                    {filteredCustomers.length} of {customers.length}
                  </Badge>
                </div>

                {/* Mobile customer cards */}
                <ul className="flex flex-col gap-2 md:hidden">
                  {filteredCustomers.map((customer) => (
                    <li key={customer.key} className="rounded-2xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={customerHref(customer.key)}
                            className="group inline-flex max-w-full items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                          >
                            <span className="truncate">{customer.name}</span>
                            <ChevronRight
                              className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                              aria-hidden
                            />
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {customer.email || "No email"}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold">
                          {formatPrice(customer.spent)}
                        </p>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Orders</p>
                          <p className="font-semibold">{customer.orders}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Units</p>
                          <p className="font-semibold">{customer.units}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">City</p>
                          <p className="truncate font-medium">{customer.city || "—"}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                        <p className="text-[10px] text-muted-foreground">
                          Last order {customer.lastOrder ? formatDate(customer.lastOrder) : "—"}
                        </p>
                        <div className="ml-auto flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            render={<Link href={customerHref(customer.key)} />}
                          >
                            Profile
                            <ChevronRight data-icon="inline-end" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewCustomerOrders(customer)}
                          >
                            View orders
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {!filteredCustomers.length && (
                    <li className="rounded-2xl border px-4 py-10 text-center text-sm text-muted-foreground">
                      {customers.length
                        ? "No customers match that search."
                        : "Customers will appear here after the first order."}
                    </li>
                  )}
                </ul>

                {/* Desktop customer table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Units</TableHead>
                        <TableHead className="text-right">Spent</TableHead>
                        <TableHead>Last order</TableHead>
                        <TableHead className="w-36 text-right">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.key}>
                          <TableCell>
                            <Link
                              href={customerHref(customer.key)}
                              className="group inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
                            >
                              {customer.name}
                              <ChevronRight
                                className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                                aria-hidden
                              />
                            </Link>
                            <span className="block text-[10px] text-muted-foreground">
                              {customer.email || "No email"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {customer.city || "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {customer.orders}
                          </TableCell>
                          <TableCell className="text-right text-xs">{customer.units}</TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {formatPrice(customer.spent)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {customer.lastOrder ? formatDate(customer.lastOrder) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => viewCustomerOrders(customer)}
                              >
                                View orders
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                render={<Link href={customerHref(customer.key)} />}
                                aria-label={`Open ${customer.name} profile`}
                                title="Open profile"
                              >
                                <ChevronRight aria-hidden />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {!filteredCustomers.length && (
                        <EmptyRow colSpan={7}>
                          {customers.length
                            ? "No customers match that search."
                            : "Customers will appear here after the first order."}
                        </EmptyRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <InsightsPanel
            orders={rangeOrders}
            products={products}
            rangeLabel={rangeLabel}
            canManage={canManage}
            onEditProduct={openEdit}
            onFilterStatus={viewStatusOrders}
          />
        </TabsContent>
      </Tabs>

      {formState && (
        <ProductFormDialog
          product={formState.product}
          duplicate={formState.duplicate}
          open
          onOpenChange={(open) => {
            if (!open) setFormState(null);
          }}
          onSaved={handleProductSaved}
        />
      )}

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

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="p-5 sm:max-w-md sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg">Delete product?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.sourceId
                ? "This permanently deletes the Supabase row, its wishlist entries and its reviews. This cannot be undone."
                : "This local demo product will be removed from the dashboard for this session."}
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="rounded-2xl border p-3">
              <p className="text-sm font-medium">{deleteTarget.product.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {deleteTarget.product.brand} · {deleteTarget.product.slug}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting && <Loader2 className="animate-spin" aria-hidden />}
              Delete product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Width-agnostic label for the bar tooltip (avoids Intl in the template string). */
function formatValue(value: number) {
  return `$${value.toFixed(0)}`;
}
