"use client";

import * as React from "react";
import { Boxes, CircleDollarSign, ImageIcon, PackagePlus, TrendingUp, UserCheck, Users, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/data/catalog-meta";
import { totalStock } from "@/lib/data/products";
import { formatPrice } from "@/lib/format";
import type { AdminProduct, Category, Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_DOTS: Record<OrderStatus, string> = {
  pending: "bg-amber-500",
  processing: "bg-blue-500",
  shipped: "bg-violet-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
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

type InsightsPanelProps = {
  orders: Order[];
  products: AdminProduct[];
  rangeLabel: string;
  canManage: boolean;
  onEditProduct: (entry: AdminProduct) => void;
  onFilterStatus: (status: OrderStatus) => void;
};

function Stat({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card size="sm" className="rounded-2xl transition-shadow hover:shadow-sm">
      <CardContent className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {label}
          </p>
          <p className="font-heading mt-1.5 text-xl font-semibold sm:text-2xl">{value}</p>
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

function SectionHeading({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function Thumb({ src }: { src?: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
      {src ? (
        // Insights mix local product photography with admin-entered remote URLs.
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

export function InsightsPanel({
  orders,
  products,
  rangeLabel,
  canManage,
  onEditProduct,
  onFilterStatus,
}: InsightsPanelProps) {
  const validOrders = React.useMemo(
    () => orders.filter((order) => order.status !== "cancelled"),
    [orders]
  );

  const revenue = validOrders.reduce((sum, order) => sum + order.total, 0);
  const units = validOrders.reduce(
    (sum, order) => sum + order.items.reduce((lineTotal, line) => lineTotal + line.quantity, 0),
    0
  );

  const repeatRate = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const order of validOrders) {
      const key = (order.customer.email || order.customer.fullName || order.id)
        .trim()
        .toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (!counts.size) return 0;
    return Math.round(
      ([...counts.values()].filter((count) => count > 1).length / counts.size) * 100
    );
  }, [validOrders]);

  const soldProducts = React.useMemo(() => {
    const byId = new Map(products.map((entry) => [entry.product.id, entry.product]));
    const bySlug = new Map(products.map((entry) => [entry.product.slug, entry.product]));
    const byName = new Map(products.map((entry) => [entry.product.name, entry.product]));
    const rows = new Map<string, SoldProduct>();

    for (const order of validOrders) {
      for (const line of order.items) {
        const match =
          byId.get(line.productId) ||
          (line.slug ? bySlug.get(line.slug) : undefined) ||
          byName.get(line.name);

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
  }, [products, validOrders]);

  const topProducts = soldProducts.slice(0, 6);
  const bestRevenue = topProducts[0]?.revenue ?? 0;

  const categoryMix = React.useMemo(() => {
    const byId = new Map(products.map((entry) => [entry.product.id, entry.product]));
    const bySlug = new Map(products.map((entry) => [entry.product.slug, entry.product]));
    const byName = new Map(products.map((entry) => [entry.product.name, entry.product]));
    const rows = new Map<Category | "other", { revenue: number; units: number }>();

    for (const order of validOrders) {
      for (const line of order.items) {
        const match =
          byId.get(line.productId) ||
          (line.slug ? bySlug.get(line.slug) : undefined) ||
          byName.get(line.name);
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
  }, [products, validOrders]);

  const pipeline = React.useMemo(
    () =>
      (
        [
          "pending",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
        ] as OrderStatus[]
      ).map((status) => {
        const count = orders.filter((order) => order.status === status).length;
        return {
          status,
          count,
          share: orders.length ? Math.round((count / orders.length) * 100) : 0,
        };
      }),
    [orders]
  );

  const restockQueue = React.useMemo(
    () =>
      products
        .map((entry) => ({ entry, stock: totalStock(entry.product) }))
        .filter((row) => row.stock < 15)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 6),
    [products]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Net revenue"
          value={formatPrice(revenue)}
          hint={`${rangeLabel} · cancelled orders excluded`}
          icon={CircleDollarSign}
          tone="bg-emerald-500/10 text-emerald-700"
        />
        <Stat
          label="Units sold"
          value={String(units)}
          hint={`${validOrders.length} fulfilled or active order${validOrders.length === 1 ? "" : "s"}`}
          icon={Boxes}
          tone="bg-blue-500/10 text-blue-700"
        />
        <Stat
          label="Repeat rate"
          value={`${repeatRate}%`}
          hint="Customers with more than one order"
          icon={UserCheck}
          tone="bg-violet-500/10 text-violet-700"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-heading flex items-center gap-2 text-lg font-semibold">
                  <TrendingUp className="size-4" aria-hidden />
                  Top products
                </h2>
                <p className="text-xs text-muted-foreground">{rangeLabel} · ranked by revenue</p>
              </div>
              <Badge variant="outline" className="rounded-full">
                {soldProducts.length} sold
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
                            width: `${bestRevenue ? Math.max(4, (product.revenue / bestRevenue) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs font-semibold">{formatPrice(product.revenue)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyHint>No product sales in this period yet.</EmptyHint>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h2 className="font-heading flex items-center gap-2 text-lg font-semibold">
                <Users className="size-4" aria-hidden />
                Category mix
              </h2>
              <p className="text-xs text-muted-foreground">
                Revenue share across {rangeLabel.toLowerCase()}
              </p>
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
                      {slice.units} unit{slice.units === 1 ? "" : "s"} · {Math.round(slice.share)}%
                      of revenue
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint>Category performance appears after the first sale.</EmptyHint>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div>
              <h2 className="font-heading text-lg font-semibold">Order pipeline</h2>
              <p className="text-xs text-muted-foreground">
                {orders.length} order{orders.length === 1 ? "" : "s"} in {rangeLabel.toLowerCase()}.
                Tap a status to filter orders.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              {pipeline.map(({ status, count, share }) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onFilterStatus(status)}
                  disabled={!count}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left text-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
                >
                  <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOTS[status])} />
                  <span className="flex-1 font-medium capitalize">{status}</span>
                  <span className="font-semibold">{count}</span>
                  <span className="w-9 text-right text-[10px] text-muted-foreground">
                    {share}%
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-heading flex items-center gap-2 text-lg font-semibold">
                  <PackagePlus className="size-4" aria-hidden />
                  Restock queue
                </h2>
                <p className="text-xs text-muted-foreground">
                  Lowest stock across the catalogue — jump straight into editing.
                </p>
              </div>
              <Badge variant="outline" className="rounded-full">
                {restockQueue.length}
              </Badge>
            </div>

            {restockQueue.length ? (
              <ul className="flex flex-col gap-2">
                {restockQueue.map(({ entry, stock }) => (
                  <li
                    key={`${entry.sourceId ?? "local"}-${entry.product.id}`}
                    className="flex items-center gap-3 rounded-2xl border p-2.5"
                  >
                    <Thumb src={entry.product.images[0]} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{entry.product.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {entry.product.brand} · {formatPrice(entry.product.price)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full text-[10px]",
                        stock === 0
                          ? "border-transparent bg-red-500/10 text-red-700 dark:text-red-400"
                          : "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      )}
                    >
                      {stock === 0 ? "Out" : `${stock} left`}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onEditProduct(entry)}
                      disabled={!canManage}
                      aria-label={`Restock ${entry.product.name}`}
                    >
                      Restock
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyHint>Every product is above the low-stock threshold.</EmptyHint>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

