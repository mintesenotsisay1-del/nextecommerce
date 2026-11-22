"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  Copy,
  DollarSign,
  Download,
  Eye,
  ImageIcon,
  Loader2,
  MessageSquare,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  TrendingUp,
  TriangleAlert,
  UserCheck,
  Users,
  X,
  type LucideIcon,
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
import { StorefrontSettingsPanel } from "@/components/admin/storefront-settings-panel";
import { ReviewsPanel } from "@/components/admin/reviews-panel";
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
import type { AdminProduct, AdminStats, Category, Order, OrderStatus, Review } from "@/lib/types";
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

const ORDER_STATUS_ITEMS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_DOT: Record<OrderStatus, string> = {
  pending: "bg-amber-500",
  processing: "bg-blue-500",
  shipped: "bg-violet-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
};

const STATUS_SELECT_STYLES: Record<OrderStatus, string> = {
  pending:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/20",
  processing:
    "border-blue-500/20 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/20",
  shipped:
    "border-violet-500/20 bg-violet-500/10 text-violet-700 hover:bg-violet-500/15 dark:bg-violet-500/15 dark:text-violet-300 dark:hover:bg-violet-500/20",
  delivered:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/20",
  cancelled:
    "border-red-500/20 bg-red-500/10 text-red-700 hover:bg-red-500/15 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/20",
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

const AVATAR_TONES = [
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
];

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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
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
        "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/5",
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

function CustomerAvatar({
  name,
  seed,
  className,
}: {
  name: string;
  seed: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-1 ring-foreground/5 ring-inset",
        AVATAR_TONES[hashString(seed || name) % AVATAR_TONES.length],
        className
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

function StockBar({ stock, className }: { stock: number; className?: string }) {
  const percent = stock === 0 ? 0 : Math.max(6, Math.min(100, (stock / 60) * 100));
  return (
    <span className={cn("block h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <span
        className={cn(
          "block h-full rounded-full transition-all",
          stock === 0 ? "bg-red-500" : stock < 15 ? "bg-amber-500" : "bg-emerald-500"
        )}
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}

function MiniStat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  className,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
  className?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn("rounded-2xl transition-shadow hover:shadow-sm", className)}
    >
      <CardContent className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-heading mt-1.5 truncate text-xl font-semibold sm:text-2xl">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
        </div>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9",
            tone
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}

function HealthBadge({ health }: { health: Health }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
        health === "healthy" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        health === "low" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        health === "critical" && "bg-red-500/10 text-red-700 dark:text-red-400"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          health === "healthy" && "bg-emerald-500",
          health === "low" && "bg-amber-500",
          health === "critical" && "bg-red-500"
        )}
        aria-hidden
      />
      {health}
    </span>
  );
}

function PanelHeading({
  icon: Icon,
  title,
  description,
  action,
  tone = "bg-primary/10 text-primary",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-2xl",
            tone
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative w-full sm:max-w-sm">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-full bg-background pr-9 pl-9"
        aria-label={ariaLabel}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon = PackageSearch,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center",
        className
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-2xl bg-background text-muted-foreground ring-1 ring-foreground/10">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function EmptyRow({ children, colSpan }: { children: React.ReactNode; colSpan: number }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-10">
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Search className="size-4" aria-hidden />
          </span>
          <p className="text-sm font-semibold">No matches</p>
          <p className="text-xs text-muted-foreground">{children}</p>
        </div>
      </TableCell>
    </TableRow>
  );
}

function OrderStatusSelect({
  order,
  disabled,
  className,
  onStatusChange,
}: {
  order: Order;
  disabled?: boolean;
  className?: string;
  onStatusChange: (status: OrderStatus) => void;
}) {
  return (
    <Select
      items={ORDER_STATUS_ITEMS}
      value={order.status}
      onValueChange={(value) => {
        if (value) onStatusChange(value as OrderStatus);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-32 gap-1.5 rounded-full border-transparent px-2.5 text-[11px] font-semibold capitalize shadow-none",
          STATUS_SELECT_STYLES[order.status],
          className
        )}
        aria-label={`Status for order ${order.id}`}
      >
        <span
          className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[order.status])}
          aria-hidden
        />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {ORDER_STATUSES.map((status) => (
          <SelectItem key={status} value={status} className="capitalize">
            {ORDER_STATUS_ITEMS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DashboardTab({
  value,
  label,
  icon: Icon,
  count,
}: {
  value: string;
  label: string;
  icon: LucideIcon;
  count?: number;
}) {
  return (
    <TabsTrigger
      value={value}
      className="group/tab h-9 shrink-0 gap-1.5 rounded-xl px-2.5 text-xs font-semibold data-active:bg-background data-active:shadow-sm sm:px-3"
    >
      <Icon
        className="size-4 text-muted-foreground transition-colors group-data-[active]/tab:text-primary"
        aria-hidden
      />
      <span>{label}</span>
      {typeof count === "number" && (
        <span className="rounded-full bg-background px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground ring-1 ring-foreground/5 transition-colors group-data-[active]/tab:bg-primary/10 group-data-[active]/tab:text-primary group-data-[active]/tab:ring-transparent">
          {count}
        </span>
      )}
    </TabsTrigger>
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
  initialTab?: "orders" | "inventory" | "customers" | "insights" | "storefront" | "reviews";
  initialOrderStatus?: OrderStatusFilter;
  initialInventoryHealth?: HealthFilter;
  openNewProduct?: boolean;
  reviews?: Review[];
  reviewsLive?: boolean;
};

export function AdminDashboard({
  orders: initialOrders,
  ordersLive,
  products: initialProducts,
  canManage,
  generatedAt,
  initialTab = "orders",
  initialOrderStatus,
  initialInventoryHealth,
  openNewProduct,
  reviews: initialReviews = [],
}: AdminDashboardProps) {
  const [orders, setOrders] = React.useState(initialOrders);
  const [products, setProducts] = React.useState(initialProducts);
  const [reviews, setReviews] = React.useState(initialReviews);
  const [tab, setTab] = React.useState(initialTab);

  const [range, setRange] = React.useState<RangeKey>("30d");
  const [orderQuery, setOrderQuery] = React.useState("");
  const [orderStatus, setOrderStatus] = React.useState<OrderStatusFilter>(
    initialOrderStatus ?? "all"
  );
  const [orderSort, setOrderSort] = React.useState<OrderSort>("newest");
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);

  const [inventoryQuery, setInventoryQuery] = React.useState("");
  const [inventoryCategory, setInventoryCategory] = React.useState<CategoryFilter>("all");
  const [inventoryHealth, setInventoryHealth] = React.useState<HealthFilter>(
    initialInventoryHealth ?? "all"
  );
  const [inventorySort, setInventorySort] = React.useState<InventorySort>("stock");

  const [customerQuery, setCustomerQuery] = React.useState("");
  const [formState, setFormState] = React.useState<FormState | null>(() =>
    openNewProduct && canManage ? { product: null, duplicate: false } : null
  );
  const [deleteTarget, setDeleteTarget] = React.useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  async function handleDeleteReview(reviewId: string) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
        if (error) {
          console.error("[admin] Could not delete review from Supabase:", error);
          throw error;
        }
      }
    }
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
  }

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

  const statusCounts = React.useMemo(() => {
    const counts: Record<OrderStatusFilter, number> = {
      all: orders.length,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const order of orders) counts[order.status] += 1;
    return counts;
  }, [orders]);

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
      tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Orders",
      value: String(rangeStats.orders),
      icon: ShoppingBag,
      change: metricChange(rangeStats.orders, previousStats.orders),
      tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Units sold",
      value: String(rangeStats.unitsSold),
      icon: Boxes,
      change: metricChange(rangeStats.unitsSold, previousStats.unitsSold),
      tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      label: "Avg order value",
      value: formatPrice(Math.round(rangeStats.avgOrderValue)),
      icon: TrendingUp,
      change: metricChange(rangeStats.avgOrderValue, previousStats.avgOrderValue),
      tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  const orderStatusFilters: {
    key: OrderStatusFilter;
    label: string;
    dot?: string;
    count: number;
  }[] = [
    { key: "all", label: "All", count: statusCounts.all },
    ...ORDER_STATUSES.map((status) => ({
      key: status,
      label: ORDER_STATUS_ITEMS[status],
      dot: STATUS_DOT[status],
      count: statusCounts[status],
    })),
  ];

  const attentionCount = catalogueStats.low + catalogueStats.out;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* Workspace actions */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card/70 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Operations workspace</p>
            <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
              {canManage
                ? "Create and edit products, move orders through fulfilment and export the data your team needs."
                : "You have read-only access. Sign in with an admin account to create products and update orders."}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Button
            variant="outline"
            onClick={() => downloadOrdersCsv(filteredOrders)}
            disabled={!filteredOrders.length}
            title="Export the orders matching the current search and status filters"
            className="h-9 w-full rounded-full bg-background sm:w-auto"
          >
            <Download data-icon="inline-start" aria-hidden />
            Export orders
          </Button>
          <Button
            onClick={openCreate}
            disabled={!canManage}
            className="h-9 w-full rounded-full sm:w-auto"
          >
            <Plus data-icon="inline-start" aria-hidden />
            Add product
          </Button>
        </div>
      </div>

      {/* Performance header + KPIs */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-foreground/5 ring-1 ring-foreground/10">
              <TrendingUp className="size-4" aria-hidden />
            </span>
            <div>
              <h2 className="font-heading text-lg font-semibold">Performance</h2>
              <p className="text-xs text-muted-foreground">
                {rangeLabel} · compared with the previous {rangeDays} days
              </p>
            </div>
          </div>
          <Select
            items={RANGE_ITEMS}
            value={range}
            onValueChange={(value) => setRange(value as RangeKey)}
          >
            <SelectTrigger
              className="h-9 w-36 rounded-full bg-background data-[size=default]:h-9"
              aria-label="Analytics period"
            >
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

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, change, tone }) => (
            <Card
              key={label}
              size="sm"
              className="rounded-2xl transition-shadow hover:shadow-sm"
            >
              <CardContent className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    {label}
                  </p>
                  <p className="font-heading mt-1.5 truncate text-xl font-semibold sm:text-2xl">
                    {value}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        change.up
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-red-500/10 text-red-700 dark:text-red-400"
                      )}
                    >
                      {change.label !== "New" &&
                        (change.up ? (
                          <ArrowUp className="size-3" aria-hidden />
                        ) : (
                          <ArrowDown className="size-3" aria-hidden />
                        ))}
                      {change.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      vs prev. {rangeDays}d
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9",
                    tone
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Revenue chart */}
      <Card className="rounded-3xl">
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <TrendingUp className="size-5" aria-hidden />
              </span>
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
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full bg-background">
                {peak.value > 0 ? `Peak ${formatPrice(peak.value)}` : "No revenue yet"}
              </Badge>
              <Badge
                variant="outline"
                className="rounded-full bg-background text-muted-foreground"
              >
                {chart.length} intervals
              </Badge>
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/20 p-3 sm:p-4">
            <div
              className="flex h-44 items-end gap-1 sm:gap-2"
              role="img"
              aria-label={`Revenue trend for ${rangeLabel.toLowerCase()}`}
            >
              {chart.map((bucket, index) => (
                <div
                  key={`${bucket.full}-${index}`}
                  className="group/bar flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
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
                      className="w-full rounded-t-lg bg-gradient-to-t from-primary/45 to-primary transition-all group-hover/bar:from-primary/60 group-hover/bar:to-primary"
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
          </div>
        </CardContent>
      </Card>

      {/* Operations */}
      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="gap-4">
        <div className="sticky top-16 z-30 -mx-3 border-y bg-background/80 px-3 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <TabsList className="scrollbar-hide h-auto min-h-11 w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-muted/40 p-1 sm:w-fit">
            <DashboardTab
              value="orders"
              label="Orders"
              icon={ShoppingBag}
              count={orders.length}
            />
            <DashboardTab
              value="inventory"
              label="Inventory"
              icon={Boxes}
              count={products.length}
            />
            <DashboardTab
              value="customers"
              label="Customers"
              icon={Users}
              count={customers.length}
            />
            <DashboardTab value="insights" label="Insights" icon={BarChart3} />
            <DashboardTab
              value="reviews"
              label="Reviews"
              icon={MessageSquare}
              count={reviews.length}
            />
            <DashboardTab value="storefront" label="Storefront" icon={Store} />
          </TabsList>
        </div>

        <TabsContent value="orders">
          <Card className="rounded-3xl">
            <CardContent className="flex flex-col gap-5">
              <PanelHeading
                icon={ShoppingBag}
                title="Orders"
                description={`${filteredOrders.length} of ${orders.length} orders · ${rangeLabel}`}
                action={
                  <span className="inline-flex items-center gap-1.5 self-start rounded-full border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground sm:self-auto">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        ordersLive ? "bg-emerald-500" : "bg-amber-500"
                      )}
                      aria-hidden
                    />
                    {ordersLive ? "Live orders" : "Demo orders"}
                  </span>
                }
              />

              <div className="scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {orderStatusFilters.map((filter) => {
                  const active = orderStatus === filter.key;
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setOrderStatus(filter.key)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                        active
                          ? "border-foreground/10 bg-foreground text-background shadow-sm"
                          : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {filter.dot && (
                        <span
                          className={cn("size-1.5 rounded-full", filter.dot)}
                          aria-hidden
                        />
                      )}
                      {filter.label}
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[9px] font-semibold",
                          active
                            ? "bg-background/20 text-background"
                            : "bg-background text-muted-foreground"
                        )}
                      >
                        {filter.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchBox
                  value={orderQuery}
                  onChange={setOrderQuery}
                  placeholder="Search order, customer, email…"
                  ariaLabel="Search orders"
                />
                <div className="flex items-center gap-2 sm:ml-auto">
                  <Select
                    items={ORDER_SORT_ITEMS}
                    value={orderSort}
                    onValueChange={(value) => setOrderSort(value as OrderSort)}
                  >
                    <SelectTrigger
                      className="h-9 w-full rounded-full bg-background data-[size=default]:h-9 sm:w-40"
                      aria-label="Sort orders"
                    >
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
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                    {filteredOrders.length} shown
                  </span>
                </div>
              </div>

              {/* Mobile order cards */}
              <ul className="flex flex-col gap-2.5 md:hidden">
                {filteredOrders.map((order) => {
                  const units = order.items.reduce((sum, line) => sum + line.quantity, 0);
                  return (
                    <li
                      key={order.id}
                      className="rounded-2xl border bg-background p-3.5 transition-shadow hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="truncate font-mono text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                          onClick={() => setSelectedOrder(order)}
                        >
                          {order.id}
                        </button>
                        <OrderStatusSelect
                          order={order}
                          disabled={!canManage}
                          className="shrink-0"
                          onStatusChange={(status) => void updateStatus(order, status)}
                        />
                      </div>

                      <div className="mt-3 flex items-start gap-2.5">
                        <CustomerAvatar
                          name={order.customer.fullName || "Guest"}
                          seed={order.customer.email || order.id}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {order.customer.fullName || "Guest"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {order.customer.email || order.customer.city || "No contact details"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold">{formatPrice(order.total)}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-2.5 py-2">
                        <p className="min-w-0 truncate text-[10px] text-muted-foreground">
                          {order.items
                            .map((line) => `${line.quantity}× ${line.name}`)
                            .join(", ") || "No items recorded"}
                        </p>
                        <span className="shrink-0 rounded-full bg-background px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                          {units} unit{units === 1 ? "" : "s"}
                        </span>
                      </div>

                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                          aria-label={`View order ${order.id}`}
                          className="rounded-full"
                        >
                          View details
                          <ChevronRight data-icon="inline-end" aria-hidden />
                        </Button>
                      </div>
                    </li>
                  );
                })}
                {!filteredOrders.length && (
                  <li>
                    <EmptyState
                      icon={Search}
                      title="No orders found"
                      description="Try a different search or status filter."
                    />
                  </li>
                )}
              </ul>

              {/* Desktop order table */}
              <div className="hidden overflow-hidden rounded-2xl border md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="pl-4">Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-36">Status</TableHead>
                      <TableHead className="w-12 pr-4 text-right">
                        <span className="sr-only">View</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const units = order.items.reduce((sum, line) => sum + line.quantity, 0);
                      return (
                        <TableRow key={order.id} className="group">
                          <TableCell className="pl-4">
                            <button
                              type="button"
                              className="font-mono text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                              onClick={() => setSelectedOrder(order)}
                            >
                              {order.id}
                            </button>
                            <span className="mt-0.5 block text-[10px] text-muted-foreground">
                              {formatDate(order.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <CustomerAvatar
                                name={order.customer.fullName || "Guest"}
                                seed={order.customer.email || order.id}
                                className="size-8"
                              />
                              <div className="min-w-0">
                                <p className="max-w-40 truncate text-xs font-semibold">
                                  {order.customer.fullName || "Guest"}
                                </p>
                                <p className="max-w-40 truncate text-[10px] text-muted-foreground">
                                  {order.customer.email ||
                                    order.customer.city ||
                                    "No contact details"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="max-w-56 truncate text-xs">
                              {order.items
                                .slice(0, 2)
                                .map((line) => `${line.quantity}× ${line.name}`)
                                .join(", ") || "—"}
                            </p>
                            <span className="mt-0.5 inline-flex rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                              {units} unit{units === 1 ? "" : "s"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold">
                            {formatPrice(order.total)}
                          </TableCell>
                          <TableCell>
                            <OrderStatusSelect
                              order={order}
                              disabled={!canManage}
                              onStatusChange={(status) => void updateStatus(order, status)}
                            />
                          </TableCell>
                          <TableCell className="pr-4 text-right">
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
                      <EmptyRow colSpan={6}>
                        Try a different search or status filter.
                      </EmptyRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              <MiniStat
                label="Catalogue"
                value={String(products.length)}
                hint={`${products.length - catalogueStats.local} live · ${catalogueStats.local} local demo`}
                icon={PackageSearch}
                tone="bg-primary/10 text-primary"
              />
              <MiniStat
                label="Units in stock"
                value={String(catalogueStats.units)}
                hint="Ready to sell across every size"
                icon={Boxes}
                tone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
              />
              <MiniStat
                label="Needs attention"
                value={String(attentionCount)}
                hint={`${catalogueStats.low} low · ${catalogueStats.out} out of stock`}
                icon={TriangleAlert}
                tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              />
              <MiniStat
                label="Inventory value"
                value={formatPrice(catalogueStats.value)}
                hint="At current retail prices"
                icon={CircleDollarSign}
                tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              />
            </div>

            <Card className="rounded-3xl">
              <CardContent className="flex flex-col gap-5">
                <PanelHeading
                  icon={Boxes}
                  title="Inventory"
                  description={`${filteredProducts.length} of ${products.length} products · ${catalogueStats.units} units on hand`}
                  action={
                    <Badge
                      variant="outline"
                      className="self-start rounded-full bg-background sm:self-auto"
                    >
                      {attentionCount ? `${attentionCount} need attention` : "All stocked"}
                    </Badge>
                  }
                />

                <div className="flex flex-col gap-2 rounded-2xl border bg-muted/20 p-2.5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <SearchBox
                      value={inventoryQuery}
                      onChange={setInventoryQuery}
                      placeholder="Search product, brand, slug…"
                      ariaLabel="Search inventory"
                    />
                    <div className="flex gap-2 sm:ml-auto">
                      <Button
                        variant="outline"
                        onClick={() => downloadInventoryCsv(filteredProducts)}
                        disabled={!filteredProducts.length}
                        className="h-9 flex-1 rounded-full bg-background sm:flex-none"
                      >
                        <Download data-icon="inline-start" aria-hidden />
                        Export
                      </Button>
                      <Button
                        onClick={openCreate}
                        disabled={!canManage}
                        className="h-9 flex-1 rounded-full sm:flex-none"
                      >
                        <Plus data-icon="inline-start" aria-hidden />
                        Add product
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Select
                      items={CATEGORY_ITEMS}
                      value={inventoryCategory}
                      onValueChange={(value) => setInventoryCategory(value as CategoryFilter)}
                    >
                      <SelectTrigger
                        className="h-9 w-full rounded-full bg-background data-[size=default]:h-9 sm:w-36"
                        aria-label="Filter by category"
                      >
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
                      <SelectTrigger
                        className="h-9 w-full rounded-full bg-background data-[size=default]:h-9 sm:w-32"
                        aria-label="Filter by stock health"
                      >
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
                        className="h-9 w-full rounded-full bg-background data-[size=default]:h-9 sm:w-40"
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
                    <span className="ml-auto hidden text-[10px] font-medium text-muted-foreground sm:flex sm:items-center">
                      {filteredProducts.length} shown
                    </span>
                  </div>
                </div>

                {/* Mobile inventory cards (< md) */}
                <ul className="flex flex-col gap-2.5 md:hidden">
                  {filteredProducts.map((entry) => {
                    const product = entry.product;
                    const stock = totalStock(product);
                    const health = productHealth(stock);
                    const discount = discountPercent(product.price, product.compareAtPrice);
                    const soldOutSizes = product.sizes.filter((size) => size.stock === 0).length;

                    return (
                      <li
                        key={`${entry.sourceId ?? "local"}-${product.id}`}
                        className="flex flex-col rounded-2xl border bg-background p-3 transition-shadow hover:shadow-sm"
                      >
                        {/* Top row: image + info */}
                        <div className="flex gap-3">
                          <ProductThumb
                            src={product.images[0]}
                            alt={product.name}
                            className="size-12 shrink-0 rounded-xl"
                          />
                          <div className="min-w-0 flex-1">
                            {/* Name on its own line so it can wrap freely */}
                            <p className="line-clamp-2 text-sm font-semibold leading-snug">
                              {product.name}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {product.brand} · {CATEGORY_LABELS[product.category]}
                            </p>
                          </div>
                          {/* Badge floats right of the whole top block */}
                          <HealthBadge health={health} />
                        </div>

                        {/* Price + stock row */}
                        <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold">
                            {formatPrice(product.price)}
                            {discount && (
                              <span className="ml-1 text-[10px] font-semibold text-red-600 dark:text-red-400">
                                −{discount}%
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {stock === 0 ? "Out of stock" : `${stock} in stock`}
                          </span>
                        </div>
                        <StockBar stock={stock} className="mt-1.5" />
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {soldOutSizes > 0
                            ? `${soldOutSizes} size${soldOutSizes === 1 ? "" : "s"} out`
                            : "All sizes stocked"}
                        </p>

                        {/* Tags */}
                        {(product.tags.length > 0 || !entry.sourceId) && (
                          <div className="mt-2 flex flex-wrap items-center gap-1">
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
                          </div>
                        )}

                        {/* Footer: slug + actions */}
                        <div className="mt-3 flex items-center gap-2 border-t pt-2.5">
                          <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted-foreground/60">
                            {product.slug}
                          </span>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(entry)}
                              disabled={!canManage}
                              aria-label={`Edit ${product.name}`}
                              className="h-8 rounded-full px-2.5 text-xs"
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
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 aria-hidden />
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  {!filteredProducts.length && (
                    <li>
                      <EmptyState
                        icon={PackageSearch}
                        title="No products found"
                        description="Try a different search or filter, or add a new product."
                        action={
                          canManage ? (
                            <Button size="sm" onClick={openCreate} className="rounded-full">
                              <Plus data-icon="inline-start" aria-hidden />
                              Add product
                            </Button>
                          ) : undefined
                        }
                      />
                    </li>
                  )}
                </ul>

                {/* Desktop inventory table (md+) */}
                <div className="hidden overflow-hidden rounded-2xl border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="pl-4">Product</TableHead>
                        <TableHead className="hidden lg:table-cell">Brand</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead className="w-32">Stock</TableHead>
                        <TableHead className="w-20">Health</TableHead>
                        <TableHead className="w-24 pr-4 text-right">
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
                            <TableCell className="pl-4">
                              <div className="flex items-center gap-3">
                                <ProductThumb src={product.images[0]} alt={product.name} />
                                <div className="min-w-0">
                                  <p className="max-w-48 truncate text-xs font-semibold lg:max-w-64">
                                    {product.name}
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-muted-foreground lg:hidden">
                                    {product.brand}
                                  </p>
                                  <p className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                                    <span className="hidden font-mono sm:inline">{product.slug}</span>
                                    {!entry.sourceId && (
                                      <Badge
                                        variant="outline"
                                        className="rounded-full px-1.5 py-0 text-[9px]"
                                      >
                                        demo
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
                            <TableCell className="hidden text-xs lg:table-cell">{product.brand}</TableCell>
                            <TableCell className="text-xs">
                              {formatPrice(product.price)}
                              {discount && (
                                <span className="ml-1 text-[10px] text-red-600 dark:text-red-400">
                                  −{discount}%
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-xs font-semibold">{stock}</span>
                                <StockBar stock={stock} className="w-20" />
                                <span className="text-[10px] text-muted-foreground">
                                  {soldOutSizes} sold out
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <HealthBadge health={health} />
                            </TableCell>
                            <TableCell className="pr-4">
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
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 aria-hidden />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!filteredProducts.length && (
                        <EmptyRow colSpan={6}>
                          Try a different search or filter.
                        </EmptyRow>
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
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
              <MiniStat
                label="Customers"
                value={String(customers.length)}
                hint="Unique customers in this order set"
                icon={Users}
                tone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
              />
              <MiniStat
                label="Repeat customers"
                value={String(repeatCustomers)}
                hint="More than one order"
                icon={UserCheck}
                tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
              />
              <MiniStat
                label="Average spend"
                value={formatPrice(
                  customers.length ? Math.round(customerSpend / customers.length) : 0
                )}
                hint="Excludes cancelled orders"
                icon={CircleDollarSign}
                tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                className="col-span-2 sm:col-span-1"
              />
            </div>

            <Card className="rounded-3xl">
              <CardContent className="flex flex-col gap-5">
                <PanelHeading
                  icon={Users}
                  title="Customers"
                  description={`${filteredCustomers.length} of ${customers.length} customers · ${repeatCustomers} repeat`}
                  action={
                    <Badge
                      variant="outline"
                      className="self-start rounded-full bg-background sm:self-auto"
                    >
                      {formatPrice(customerSpend)} lifetime
                    </Badge>
                  }
                />

                <div className="flex flex-col gap-2 rounded-2xl border bg-muted/20 p-2.5 sm:flex-row sm:items-center">
                  <SearchBox
                    value={customerQuery}
                    onChange={setCustomerQuery}
                    placeholder="Search name, email or city…"
                    ariaLabel="Search customers"
                  />
                  <span className="self-start rounded-full bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground sm:ml-auto sm:self-auto">
                    {filteredCustomers.length} shown
                  </span>
                </div>

                {/* Mobile customer cards */}
                <ul className="flex flex-col gap-2.5 md:hidden">
                  {filteredCustomers.map((customer) => (
                    <li
                      key={customer.key}
                      className="rounded-2xl border bg-background p-3.5 transition-shadow hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <CustomerAvatar
                          name={customer.name}
                          seed={customer.key}
                          className="size-10"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link
                                href={customerHref(customer.key)}
                                className="group inline-flex max-w-full items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
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
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {customer.orders > 1 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[9px] font-semibold text-violet-700 dark:text-violet-300">
                                <UserCheck className="size-2.5" aria-hidden />
                                Repeat
                              </span>
                            )}
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                              {customer.city || "No city"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-2 text-center text-xs">
                        <div>
                          <p className="text-[9px] tracking-wide text-muted-foreground uppercase">
                            Orders
                          </p>
                          <p className="mt-0.5 font-semibold">{customer.orders}</p>
                        </div>
                        <div>
                          <p className="text-[9px] tracking-wide text-muted-foreground uppercase">
                            Units
                          </p>
                          <p className="mt-0.5 font-semibold">{customer.units}</p>
                        </div>
                        <div>
                          <p className="text-[9px] tracking-wide text-muted-foreground uppercase">
                            City
                          </p>
                          <p className="mt-0.5 truncate font-semibold">{customer.city || "—"}</p>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
                        <p className="text-[10px] text-muted-foreground">
                          Last order {customer.lastOrder ? formatDate(customer.lastOrder) : "—"}
                        </p>
                        <div className="ml-auto flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewCustomerOrders(customer)}
                            className="rounded-full"
                          >
                            View orders
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            render={<Link href={customerHref(customer.key)} />}
                            className="rounded-full"
                          >
                            Profile
                            <ChevronRight data-icon="inline-end" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                  {!filteredCustomers.length && (
                    <li>
                      <EmptyState
                        icon={Users}
                        title={customers.length ? "No customers found" : "No customers yet"}
                        description={
                          customers.length
                            ? "Try a different search."
                            : "Customers will appear here after the first order."
                        }
                      />
                    </li>
                  )}
                </ul>

                {/* Desktop customer table */}
                <div className="hidden overflow-hidden rounded-2xl border md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead className="pl-4">Customer</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Units</TableHead>
                        <TableHead className="text-right">Spent</TableHead>
                        <TableHead>Last order</TableHead>
                        <TableHead className="w-36 pr-4 text-right">
                          <span className="sr-only">Actions</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.key}>
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-2.5">
                              <CustomerAvatar
                                name={customer.name}
                                seed={customer.key}
                                className="size-8"
                              />
                              <div className="min-w-0">
                                <Link
                                  href={customerHref(customer.key)}
                                  className="group inline-flex items-center gap-1 text-xs font-semibold underline-offset-4 hover:underline"
                                >
                                  {customer.name}
                                  <ChevronRight
                                    className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                                    aria-hidden
                                  />
                                </Link>
                                <span className="block max-w-48 truncate text-[10px] text-muted-foreground">
                                  {customer.email || "No email"}
                                </span>
                              </div>
                            </div>
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
                          <TableCell className="pr-4 text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => viewCustomerOrders(customer)}
                                className="rounded-full"
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
                            ? "Try a different search."
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

        <TabsContent value="reviews">
          <ReviewsPanel
            reviews={reviews}
            products={products}
            canManage={canManage}
            onDeleteReview={handleDeleteReview}
          />
        </TabsContent>

        <TabsContent value="storefront">
          <StorefrontSettingsPanel products={products} canManage={canManage} />
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
