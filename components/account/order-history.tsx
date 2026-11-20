"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  HelpCircle,
  Package,
  PackageSearch,
  RotateCcw,
  Search,
  SearchX,
  ShieldCheck,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/components/providers/cart-provider";
import { ACTIVE_ORDER_STATUSES } from "@/lib/hooks/use-orders";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "delivered" | "cancelled";

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  shipped: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_HINTS: Record<OrderStatus, string> = {
  pending: "Order received — we’ll confirm it shortly.",
  processing: "We’re getting your order ready.",
  shipped: "On its way — tracking is in your inbox.",
  delivered: "Delivered. Enjoy every step.",
  cancelled: "This order was cancelled.",
};

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "In progress" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const TRACKER_STEPS = ["Placed", "Processing", "Shipped", "Delivered"] as const;

const TRACKER_INDEX: Record<Exclude<OrderStatus, "cancelled">, number> = {
  pending: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
};

/** Clipboard API with a legacy fallback for older/insecure browsers. */
async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or document not focused — try the legacy path.
    }
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}

export function OrderHistory({ orders, loading }: { orders: Order[]; loading: boolean }) {
  const { restoreLines, openCart } = useCart();
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const deferredSearch = React.useDeferredValue(search);

  const counts = React.useMemo<Record<StatusFilter, number>>(
    () => ({
      all: orders.length,
      active: orders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status)).length,
      delivered: orders.filter((order) => order.status === "delivered").length,
      cancelled: orders.filter((order) => order.status === "cancelled").length,
    }),
    [orders]
  );

  const filtered = React.useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return orders.filter((order) => {
      if (filter === "active" && !ACTIVE_ORDER_STATUSES.includes(order.status)) return false;
      if (filter !== "all" && filter !== "active" && order.status !== filter) return false;
      if (!needle) return true;

      return (
        order.id.toLowerCase().includes(needle) ||
        order.customer.fullName.toLowerCase().includes(needle) ||
        order.customer.email.toLowerCase().includes(needle) ||
        order.items.some((line) =>
          `${line.name} ${line.brand} ${line.size}`.toLowerCase().includes(needle)
        )
      );
    });
  }, [deferredSearch, filter, orders]);

  const resetFilters = React.useCallback(() => {
    setSearch("");
    setFilter("all");
  }, []);

  const handleBuyAgain = React.useCallback(
    (order: Order) => {
      if (order.items.length === 0) {
        toast.error("Nothing to re-add", {
          description: "This order doesn’t have any saved items.",
        });
        return;
      }
      restoreLines(order.items);
      openCart();
      const units = order.items.reduce((sum, line) => sum + line.quantity, 0);
      toast.success("Added to your bag", {
        description: `${units} ${units === 1 ? "item" : "items"} from ${order.id}`,
      });
    },
    [openCart, restoreLines]
  );

  const handleCopy = React.useCallback(async (orderId: string) => {
    const copied = await writeClipboard(orderId);
    if (!copied) {
      toast.error("Couldn’t copy the order number");
      return;
    }
    setCopiedId(orderId);
    toast.success("Order number copied");
    window.setTimeout(() => {
      setCopiedId((current) => (current === orderId ? null : current));
    }, 1800);
  }, []);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="order-history-heading"
              className="font-heading text-2xl font-semibold tracking-tight"
            >
              Order history
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading
                ? "Loading your orders…"
                : orders.length === 0
                  ? "Every order, in one place."
                  : `${orders.length} ${orders.length === 1 ? "order" : "orders"} · ${counts.active} in progress`}
            </p>
          </div>
          {!loading && orders.length > 0 && (
            <Badge variant="secondary" className="shrink-0 rounded-full px-2.5">
              {filtered.length} shown
            </Badge>
          )}
        </div>

        {!loading && orders.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search orders, products or brands…"
                aria-label="Search orders"
                enterKeyHint="search"
                autoComplete="off"
                className="h-10 rounded-full border-border bg-background pr-9 pl-9 text-base shadow-none sm:text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear order search"
                  className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </div>

            <div
              className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 scrollbar-hide sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0"
              role="group"
              aria-label="Filter orders by status"
            >
              {FILTERS.map((option) => {
                const active = filter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(option.value)}
                    className={cn(
                      "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {option.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px]",
                        active ? "bg-background/20 text-background" : "bg-muted text-foreground/70"
                      )}
                    >
                      {counts[option.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!loading && orders.length > 0 && (
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {filtered.length} {filtered.length === 1 ? "order matches" : "orders match"} the current
          filters.
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-36 w-full rounded-3xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyOrders />
      ) : filtered.length === 0 ? (
        <NoResults onClear={resetFilters} />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((order) => (
            <li key={order.id}>
              <OrderCard
                order={order}
                expanded={expandedId === order.id}
                copied={copiedId === order.id}
                onToggle={() =>
                  setExpandedId((current) => (current === order.id ? null : order.id))
                }
                onBuyAgain={handleBuyAgain}
                onCopy={handleCopy}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderCard({
  order,
  expanded,
  copied,
  onToggle,
  onBuyAgain,
  onCopy,
}: {
  order: Order;
  expanded: boolean;
  copied: boolean;
  onToggle: () => void;
  onBuyAgain: (order: Order) => void;
  onCopy: (orderId: string) => void;
}) {
  const preview = order.items.slice(0, 2);
  const extra = order.items.length - preview.length;
  const units = order.items.reduce((sum, line) => sum + line.quantity, 0);
  const title =
    order.items.length === 0
      ? "Order details"
      : order.items.length === 1
        ? order.items[0].name
        : `${order.items[0].name} + ${order.items.length - 1} more`;
  const detailsId = `order-details-${order.id}`;
  const customer = order.customer;
  const cityLine = [customer.city, customer.postalCode].filter(Boolean).join(", ");

  return (
    <Card className="gap-0 overflow-hidden rounded-3xl py-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="group/order flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:p-5"
      >
        <span className="flex w-full items-start gap-3">
          <span className="flex shrink-0 -space-x-3">
            {preview.length > 0 ? (
              preview.map((line) => (
                <span
                  key={line.key}
                  className="relative size-12 overflow-hidden rounded-xl bg-muted ring-2 ring-card sm:size-14"
                >
                  <Image
                    src={line.image}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </span>
              ))
            ) : (
              <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground sm:size-14">
                <Package className="size-5" aria-hidden />
              </span>
            )}
            {extra > 0 && (
              <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-[11px] font-medium text-muted-foreground ring-2 ring-card sm:size-14">
                +{extra}
              </span>
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground">
                {order.id}
              </span>
              <Badge
                className={cn(
                  "shrink-0 rounded-full px-2 py-0 text-[10px] capitalize",
                  STATUS_STYLES[order.status]
                )}
              >
                {STATUS_LABELS[order.status]}
              </Badge>
            </span>
            <span className="mt-1 block truncate text-sm font-medium sm:text-[15px]">{title}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {formatDate(order.createdAt)} · {units} {units === 1 ? "item" : "items"}
            </span>
          </span>
        </span>

        <span className="flex items-center justify-between gap-3 border-t pt-2.5 text-xs">
          <span className="min-w-0 truncate text-muted-foreground">{STATUS_HINTS[order.status]}</span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              {expanded ? "Hide" : "Details"}
              <ChevronDown
                className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
                aria-hidden
              />
            </span>
          </span>
        </span>
      </button>

      {expanded && (
        <div
          id={detailsId}
          className="animate-in border-t bg-muted/20 px-4 pt-4 pb-4 fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none sm:px-5 sm:pb-5"
        >
          {order.status === "cancelled" ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-700 dark:text-red-400">
              <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>
                <span className="font-semibold">This order was cancelled.</span> If that’s
                unexpected, contact support with your order number.
              </p>
            </div>
          ) : (
            <OrderTracker status={order.status} />
          )}

          <div className="mt-4 border-t">
            {order.items.length > 0 ? (
              <ul className="divide-y">
                {order.items.map((line) => (
                  <li key={line.key} className="flex items-center gap-3 py-3">
                    <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-background ring-1 ring-border sm:size-14">
                      <Image
                        src={line.image}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${line.slug}`}
                        className="line-clamp-2 text-sm font-medium hover:underline"
                      >
                        {line.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {line.brand} · {line.size} · Qty {line.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatPrice(line.price * line.quantity)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-xs text-muted-foreground">
                Item details aren’t available for this order.
              </p>
            )}
          </div>

          <div className="grid gap-4 border-t py-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                Shipping to
              </p>
              {customer.fullName || customer.address || cityLine || customer.country ? (
                <address className="mt-1.5 text-xs leading-relaxed text-muted-foreground not-italic">
                  {customer.fullName && (
                    <span className="block font-medium text-foreground">{customer.fullName}</span>
                  )}
                  {customer.address && <span className="block">{customer.address}</span>}
                  {cityLine && <span className="block">{cityLine}</span>}
                  {customer.country && <span className="block">{customer.country}</span>}
                </address>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">Saved with your account</p>
              )}
            </div>

            <dl className="space-y-1.5 text-xs sm:justify-self-end sm:w-full sm:max-w-56">
              <div className="flex items-center justify-between gap-6">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-6">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</dd>
              </div>
              <div className="flex items-center justify-between gap-6 border-t pt-1.5 text-sm">
                <dt className="font-medium">Total</dt>
                <dd className="font-semibold">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              size="sm"
              className="h-9 rounded-full px-3.5"
              onClick={() => onBuyAgain(order)}
            >
              <RotateCcw aria-hidden /> Buy again
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-full bg-background px-3.5"
              onClick={() => void onCopy(order.id)}
            >
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copied" : "Copy number"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 rounded-full px-3.5"
              render={
                <a
                  href={`mailto:care@soleandstone.com?subject=${encodeURIComponent(
                    `Order help — ${order.id}`
                  )}`}
                />
              }
            >
              <HelpCircle aria-hidden /> Get help
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function OrderTracker({ status }: { status: OrderStatus }) {
  const current = TRACKER_INDEX[status as Exclude<OrderStatus, "cancelled">] ?? 0;
  const fill = (current / (TRACKER_STEPS.length - 1)) * 75;

  return (
    <div>
      <div className="relative">
        <span
          aria-hidden
          className="absolute top-4 right-[12.5%] left-[12.5%] h-0.5 rounded-full bg-border"
        />
        <span
          aria-hidden
          className="absolute top-4 left-[12.5%] h-0.5 rounded-full bg-emerald-500 transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${fill}%` }}
        />
        <div className="relative grid grid-cols-4">
          {TRACKER_STEPS.map((step, index) => {
            const done = index <= current;
            const isCurrent = index === current;
            return (
              <div key={step} className="flex min-w-0 flex-col items-center">
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 transition-colors",
                    done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-background text-muted-foreground",
                    isCurrent && "ring-4 ring-emerald-500/15"
                  )}
                >
                  {index < current ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <span
                      className={cn(
                        "rounded-full",
                        done ? "size-1.5 bg-white" : "size-1.5 bg-muted-foreground/40"
                      )}
                      aria-hidden
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "mt-1.5 text-center text-[10px] font-medium tracking-wide",
                    done ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{STATUS_HINTS[status]}</p>
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="rounded-3xl border border-dashed bg-muted/20 px-5 py-8 text-center sm:px-8 sm:py-10">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-background ring-1 ring-border">
        <PackageSearch className="size-6 text-muted-foreground" aria-hidden />
      </span>
      <p className="font-heading mt-4 text-xl font-semibold">Your order history starts here</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Every purchase, tracking update and one-tap reorder will live right here.
      </p>
      <Link href="/products" className={cn(buttonVariants(), "mt-5 rounded-full")}>
        Start shopping <ArrowRight aria-hidden />
      </Link>

      <div className="mt-8 grid gap-2 text-left sm:grid-cols-3">
        {[
          { icon: Truck, title: "Track every step", copy: "Live fulfilment status" },
          { icon: RotateCcw, title: "Easy reorders", copy: "Re-add a full order" },
          { icon: ShieldCheck, title: "30-day returns", copy: "Prepaid label included" },
        ].map((perk) => (
          <div
            key={perk.title}
            className="flex items-start gap-2.5 rounded-xl bg-background p-3 ring-1 ring-border"
          >
            <perk.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              <span className="block text-xs font-medium">{perk.title}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{perk.copy}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed px-5 py-10 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <p className="font-heading mt-4 text-lg font-semibold">No orders match</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground">
        Try another order number, product, brand or status.
      </p>
      <Button variant="outline" className="mt-4 rounded-full" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
