"use client";

import * as React from "react";
import { MapPin, Package, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatPrice } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  processing: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  shipped: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  delivered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-red-500/10 text-red-700 dark:text-red-400",
};

type OrderDetailDialogProps = {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onChangeStatus: (order: Order, status: OrderStatus) => void;
};

export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  canManage,
  onChangeStatus,
}: OrderDetailDialogProps) {
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid-cols-1 max-h-[92dvh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle className="font-heading flex flex-wrap items-center gap-2 text-lg">
            Order <span className="font-mono text-base">{order.id}</span>
            <Badge
              variant="outline"
              className={cn("rounded-full capitalize", ORDER_STATUS_STYLES[order.status])}
            >
              {order.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Placed {formatDate(order.createdAt)} · {order.items.length} line
            {order.items.length === 1 ? "" : "s"} · {units} unit{units === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted/60 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Order status</p>
              <p className="text-sm font-medium capitalize">{order.status}</p>
            </div>
            <Select
              items={Object.fromEntries(ORDER_STATUSES.map((status) => [status, status]))}
              value={order.status}
              onValueChange={(value) => {
                if (value) onChangeStatus(order, value as OrderStatus);
              }}
              disabled={!canManage}
            >
              <SelectTrigger size="sm" className="w-36 capitalize" aria-label="Order status">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-2xl border p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                <UserRound className="size-3.5" aria-hidden />
                Customer
              </p>
              <div className="text-sm">
                <p className="font-medium">{order.customer.fullName || "Guest"}</p>
                <p className="text-muted-foreground">{order.customer.email || "No email"}</p>
                <p className="text-muted-foreground">{order.customer.phone || "No phone"}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                <MapPin className="size-3.5" aria-hidden />
                Ship to
              </p>
              <div className="text-sm text-muted-foreground">
                <p>{order.customer.address || "No address"}</p>
                <p>
                  {[order.customer.city, order.customer.postalCode]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
                <p>{order.customer.country || "—"}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              <Package className="size-3.5" aria-hidden />
              Items
            </div>
            <ul className="divide-y">
              {order.items.map((item) => (
                <li key={item.key} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {item.image ? (
                      // Order images can come from local uploads or admin-entered URLs.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="size-full object-cover" />
                    ) : (
                      <Package className="size-5 text-muted-foreground" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.brand ? `${item.brand} · ` : ""}
                      {item.size || "One size"} · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </li>
              ))}
              {!order.items.length && (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No items recorded on this order.
                </li>
              )}
            </ul>
          </div>

          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <dt>Shipping</dt>
              <dd>{order.shipping ? formatPrice(order.shipping) : "Free"}</dd>
            </div>
            <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
