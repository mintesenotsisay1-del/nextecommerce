import type { Metadata } from "next";
import Link from "next/link";
import { Info, LockKeyhole, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { loadAdminOrderData } from "@/lib/data/admin-orders";
import { getStorefrontProductEntries } from "@/lib/data/storefront-products";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false },
};

const ADMIN_TABS = ["orders", "inventory", "customers", "insights"] as const;
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
  const liveCatalogue = products.some((entry) => entry.sourceId);
  const canManage = !configured || isAdmin;
  const generatedAt = new Date().toISOString();

  return (
    <div className="mx-auto max-w-7xl px-3 pt-4 pb-24 sm:px-6 sm:pt-6 lg:px-8">

      {/* ── Page header ── */}
      <header className="mb-4 sm:mb-6">
        {/* Eyebrow */}
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden /> Staff only
        </p>

        {/* Title row — badge wraps under on very small screens */}
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
            Store admin
          </h1>
          <Badge
            variant="outline"
            className="shrink-0 rounded-full py-1 text-xs"
          >
            {orders.length} recent order{orders.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {/* Sub-line — truncates gracefully on 320 px screens */}
        <p className="mt-1.5 truncate text-xs text-muted-foreground sm:text-sm">
          {user ? `Signed in as ${user.email}` : "Demo session"}{" "}
          <span className="text-muted-foreground/50">·</span>{" "}
          {ordersLive
            ? "live data from Supabase"
            : liveCatalogue
              ? "live catalogue · demo orders"
              : "demo data"}
        </p>
      </header>

      {/* ── Alerts ── */}
      {!configured && (
        <Alert className="mb-4 rounded-2xl sm:mb-5">
          <Info className="size-4 shrink-0" aria-hidden />
          <AlertTitle>Running on demo data</AlertTitle>
          <AlertDescription>
            Connect Supabase (see the project README) and create the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">orders</code> table to
            switch to live orders. Product edits are kept in this session only.
          </AlertDescription>
        </Alert>
      )}

      {configured && !isAdmin && (
        <Alert className="mb-4 rounded-2xl sm:mb-5">
          <LockKeyhole className="size-4 shrink-0" aria-hidden />
          <AlertTitle>
            {user ? "Read-only admin access" : "Sign in with an admin account"}
          </AlertTitle>
          <AlertDescription>
            {user ? (
              <>
                Signed in as{" "}
                <span className="font-medium text-foreground">{user.email}</span>, but this
                account isn&apos;t marked as admin. Set{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                  profiles.is_admin = true
                </code>{" "}
                to manage the catalogue and orders.
              </>
            ) : (
              <>
                Viewing in read-only mode.{" "}
                <Link
                  href="/auth/login?next=/admin"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  Sign in
                </Link>{" "}
                with an admin account to make changes.
              </>
            )}
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
