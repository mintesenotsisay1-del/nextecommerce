import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Info, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { loadAdminOrderData } from "@/lib/data/admin-orders";
import { getStorefrontProductEntries } from "@/lib/data/storefront-products";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false },
};

const ADMIN_TABS = ["orders", "inventory", "customers", "insights", "storefront"] as const;
type AdminTab = (typeof ADMIN_TABS)[number];

type AdminPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab = ADMIN_TABS.includes(requestedTab as AdminTab)
    ? (requestedTab as AdminTab)
    : undefined;

  const [adminData, products] = await Promise.all([
    loadAdminOrderData(),
    getStorefrontProductEntries(),
  ]);
  const { user, configured, isAdmin, orders, ordersLive } = adminData;

  // Hard redirect: when Supabase is configured, only admins may enter.
  // This runs after the middleware check and covers any edge cases where
  // the proxy layer might be skipped (e.g. direct fetch, ISR, etc.).
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

  return (
    <div className="mx-auto max-w-7xl px-3 pt-4 pb-24 sm:px-6 sm:pt-6 lg:px-8">
      {/* ── Page header ── */}
      <header className="relative mb-4 overflow-hidden rounded-3xl border bg-card p-5 sm:mb-6 sm:p-7">
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
                Orders
              </p>
              <p className="font-heading mt-0.5 text-lg font-semibold">{orders.length}</p>
            </div>
            <div className="rounded-2xl border bg-background/70 px-4 py-2.5 backdrop-blur">
              <p className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Data
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    ordersLive ? "bg-emerald-500" : "bg-amber-500"
                  )}
                  aria-hidden
                />
                {ordersLive ? "Live" : "Demo"}
              </p>
            </div>
            <Button
              variant="outline"
              className="h-10 rounded-full bg-background/70 backdrop-blur"
              render={<Link href="/" />}
            >
              View storefront <ArrowUpRight aria-hidden />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Alerts ── */}
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

      {/* ── Dashboard ── */}
      <AdminDashboard
        orders={orders}
        ordersLive={ordersLive}
        products={products}
        canManage={canManage}
        generatedAt={generatedAt}
        initialTab={initialTab}
      />
    </div>
  );
}
