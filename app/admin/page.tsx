import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Clock,
  Info,
  MessageSquare,
  Plus,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { loadAdminOrderData } from "@/lib/data/admin-orders";
import { loadAdminReviewData } from "@/lib/data/admin-reviews";
import { getStorefrontProductEntries } from "@/lib/data/storefront-products";
import { loadSiteSettings } from "@/lib/data/site-settings";
import { totalStock } from "@/lib/data/products";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false },
};

const ADMIN_TABS = [
  "orders",
  "inventory",
  "customers",
  "insights",
  "storefront",
  "reviews",
] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

type AdminPageProps = {
  searchParams: Promise<{
    tab?: string | string[];
    status?: string | string[];
    health?: string | string[];
    action?: string | string[];
  }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab = ADMIN_TABS.includes(requestedTab as AdminTab)
    ? (requestedTab as AdminTab)
    : undefined;

  const requestedStatus = Array.isArray(params.status) ? params.status[0] : params.status;
  const initialOrderStatus = (VALID_STATUSES as string[]).includes(requestedStatus ?? "")
    ? (requestedStatus as OrderStatus)
    : undefined;

  const requestedHealth = Array.isArray(params.health) ? params.health[0] : params.health;
  const initialInventoryHealth = ["all", "healthy", "low", "critical"].includes(requestedHealth ?? "")
    ? (requestedHealth as "all" | "healthy" | "low" | "critical")
    : undefined;

  const openNewProduct = params.action === "new-product";

  const [adminData, products, reviewData, settings] = await Promise.all([
    loadAdminOrderData(),
    getStorefrontProductEntries(),
    loadAdminReviewData(),
    loadSiteSettings(),
  ]);
  const { user, configured, isAdmin, orders, ordersLive } = adminData;
  const { reviews, reviewsLive } = reviewData;

  // Hard redirect: when Supabase is configured, only admins may enter.
  if (configured && user && !isAdmin) {
    redirect("/account");
  }

  const liveCatalogue = products.some((entry) => entry.sourceId);
  const canManage = !configured || isAdmin;
  const generatedAt = new Date().toISOString();
  const dataMode = ordersLive
    ? "Live orders from Supabase"
    : liveCatalogue
      ? "Live catalogue · demo orders"
      : "Demo data";

  // ── Executive Store Metrics ──
  const validOrders = orders.filter((o) => o.status !== "cancelled");
  const grossRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
  const aov = validOrders.length > 0 ? Math.round(grossRevenue / validOrders.length) : 0;
  const pendingOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "processing"
  );

  const lowStockCount = products.filter((p) => {
    const stock = totalStock(p.product);
    return stock > 0 && stock < 15;
  }).length;
  const criticalStockCount = products.filter(
    (p) => totalStock(p.product) === 0
  ).length;

  const totalReviewsCount = reviews.length;
  const avgRating =
    totalReviewsCount > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviewsCount).toFixed(1)
      : "—";

  return (
    <div className="mx-auto max-w-7xl px-3 pt-4 pb-24 sm:px-6 sm:pt-6 lg:px-8">
      {/* ── Page header ── */}
      <header className="relative mb-5 overflow-hidden rounded-3xl border bg-card p-5 sm:mb-6 sm:p-7">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-20 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase backdrop-blur">
              <ShieldCheck className="size-3" aria-hidden /> Staff workspace
            </p>
            <h1 className="font-heading mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Store admin
            </h1>
            <p className="mt-2 max-w-xl truncate text-xs text-muted-foreground sm:text-sm">
              {user ? `Signed in as ${user.email}` : "Demo session"}{" "}
              <span className="mx-1 text-muted-foreground/40">·</span> {dataMode}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border bg-background/70 px-4 py-2.5 backdrop-blur">
              <p className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Data Stream
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    ordersLive ? "bg-emerald-500" : "bg-amber-500"
                  )}
                  aria-hidden
                />
                {ordersLive ? "Live Supabase" : "Demo local"}
              </p>
            </div>

            {canManage && (
              <Button
                variant="default"
                className="h-10 gap-1.5 rounded-full shadow-sm"
                render={<Link href="/admin?tab=inventory&action=new-product" />}
              >
                <Plus className="size-4" aria-hidden />
                <span>New product</span>
              </Button>
            )}

            <Button
              variant="outline"
              className="h-10 rounded-full bg-background/70 backdrop-blur"
              render={<Link href="/" target="_blank" />}
            >
              <span>Storefront</span>
              <ArrowUpRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        {/* ── Executive Metric Ribbons ── */}
        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {/* Revenue */}
          <div className="flex flex-col justify-between rounded-2xl border bg-background/50 p-3.5 backdrop-blur-sm sm:p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold tracking-wider uppercase">Gross Revenue</span>
              <CircleDollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2">
              <span className="font-heading text-xl font-bold sm:text-2xl">
                {formatPrice(grossRevenue, settings.currency)}
              </span>
              <p className="text-[11px] text-muted-foreground">
                AOV {formatPrice(aov, settings.currency)} · {validOrders.length} orders
              </p>
            </div>
          </div>

          {/* Fulfillment */}
          <Link
            href="/admin?tab=orders&status=pending"
            className="group flex flex-col justify-between rounded-2xl border bg-background/50 p-3.5 backdrop-blur-sm transition-colors hover:border-amber-500/40 hover:bg-amber-500/5 sm:p-4"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold tracking-wider uppercase group-hover:text-amber-700 dark:group-hover:text-amber-300">
                To Fulfill
              </span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-bold sm:text-2xl">
                  {pendingOrders.length}
                </span>
                <span className="text-xs text-muted-foreground">orders</span>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                {pendingOrders.length > 0 ? "Requires packing" : "All orders dispatched"}
              </p>
            </div>
          </Link>

          {/* Inventory Health */}
          <Link
            href="/admin?tab=inventory&health=low"
            className="group flex flex-col justify-between rounded-2xl border bg-background/50 p-3.5 backdrop-blur-sm transition-colors hover:border-red-500/40 hover:bg-red-500/5 sm:p-4"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold tracking-wider uppercase group-hover:text-red-700 dark:group-hover:text-red-300">
                Low Stock Alert
              </span>
              <Boxes className="size-4 text-rose-500" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-bold sm:text-2xl">
                  {lowStockCount + criticalStockCount}
                </span>
                <span className="text-xs text-muted-foreground">styles</span>
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                {criticalStockCount > 0 ? `${criticalStockCount} out of stock` : `${products.length} styles active`}
              </p>
            </div>
          </Link>

          {/* Customer Reviews */}
          <Link
            href="/admin?tab=reviews"
            className="group flex flex-col justify-between rounded-2xl border bg-background/50 p-3.5 backdrop-blur-sm transition-colors hover:border-amber-500/40 hover:bg-amber-500/5 sm:p-4"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] font-bold tracking-wider uppercase group-hover:text-amber-700 dark:group-hover:text-amber-300">
                Reviews
              </span>
              <Star className="size-4 text-amber-400 fill-amber-400" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-xl font-bold sm:text-2xl">
                  {avgRating}
                </span>
                <span className="text-xs text-muted-foreground">/ 5.0</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {totalReviewsCount} customer ratings
              </p>
            </div>
          </Link>
        </div>

        {/* ── Operations Shortcuts Bar ── */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Quick jumps:</span>
          <Link
            href="/admin?tab=orders&status=pending"
            className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-3 py-1 font-medium transition-colors hover:bg-muted"
          >
            <Clock className="size-3 text-amber-500" />
            <span>Pending orders ({pendingOrders.length})</span>
          </Link>
          <Link
            href="/admin?tab=inventory&health=low"
            className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-3 py-1 font-medium transition-colors hover:bg-muted"
          >
            <AlertCircle className="size-3 text-rose-500" />
            <span>Low stock ({lowStockCount + criticalStockCount})</span>
          </Link>
          <Link
            href="/admin?tab=reviews"
            className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-3 py-1 font-medium transition-colors hover:bg-muted"
          >
            <MessageSquare className="size-3 text-amber-500" />
            <span>Customer feedback ({totalReviewsCount})</span>
          </Link>
          <Link
            href="/admin?tab=storefront"
            className="inline-flex items-center gap-1 rounded-full border bg-background/80 px-3 py-1 font-medium transition-colors hover:bg-muted"
          >
            <span>Storefront layout & branding</span>
          </Link>
        </div>
      </header>

      {/* ── Demo Notice Alert ── */}
      {!configured && (
        <Alert className="mb-4 rounded-2xl border-amber-500/20 bg-amber-500/5 sm:mb-5">
          <Info className="size-4 shrink-0 text-amber-600" aria-hidden />
          <AlertTitle>Running on demo data</AlertTitle>
          <AlertDescription>
            Connect Supabase (see the project README) and create the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">orders</code> table to
            switch to live orders. Product edits are kept in this session only.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Interactive Dashboard ── */}
      <AdminDashboard
        orders={orders}
        ordersLive={ordersLive}
        products={products}
        canManage={canManage}
        generatedAt={generatedAt}
        initialTab={initialTab}
        initialOrderStatus={initialOrderStatus}
        initialInventoryHealth={initialInventoryHealth}
        openNewProduct={openNewProduct}
        reviews={reviews}
        reviewsLive={reviewsLive}
      />
    </div>
  );
}
