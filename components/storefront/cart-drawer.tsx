"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Minus,
  Plus,
  RotateCcw,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useCart } from "@/components/providers/cart-provider";
import { formatPrice } from "@/lib/format";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";

const DESKTOP_QUERY = "(min-width: 768px)";

export function CartDrawer() {
  const { lines, count, subtotal, isOpen, openCart, closeCart, removeLine, setQuantity, restoreLines, freeShippingThreshold: threshold } =
    useCart();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const remaining = Math.max(0, threshold - subtotal);
  const freeShipping = subtotal >= threshold;
  // Keep "99%" honest until the threshold is actually crossed.
  const progress = freeShipping
    ? 100
    : Math.min(99, Math.floor((subtotal / threshold) * 100));
  const side = isDesktop ? "right" : "bottom";

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => (open ? openCart() : closeCart())}
      swipeDirection={isDesktop ? "right" : "down"}
    >
      <DrawerContent side={side} showCloseButton={false}>
        <DrawerBody>
          {/* Drag affordance — mobile bottom sheet only. The whole sheet is
              swipeable; this just tells the thumb where to pull. */}
          <div className="flex shrink-0 justify-center pt-3 pb-1 md:hidden" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/25" />
          </div>

          <header className="flex shrink-0 items-start justify-between gap-3 border-b px-4 pb-3.5 pt-1 md:px-6 md:py-5">
            <div className="min-w-0">
              <DrawerTitle className="flex flex-wrap items-baseline gap-x-2 font-heading text-lg font-semibold">
                Your bag
                <span className="text-sm font-normal text-muted-foreground tabular-nums">
                  {count} {count === 1 ? "item" : "items"}
                </span>
              </DrawerTitle>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {lines.length} {lines.length === 1 ? "style" : "styles"} · saved on this device
              </p>
              <DrawerDescription className="sr-only">
                Review and update the items in your bag before checkout.
              </DrawerDescription>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Link
                href="/cart"
                onClick={closeCart}
                className="hidden rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
              >
                View bag
              </Link>
              <DrawerClose
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Close bag"
                    className="size-10 rounded-full md:size-9"
                  />
                }
              >
                <X className="size-5" aria-hidden />
              </DrawerClose>
            </div>
          </header>

          {lines.length === 0 ? (
            <div className="flex min-h-[18rem] flex-1 flex-col items-center justify-center gap-5 px-6 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center md:py-16">
              <span className="relative flex size-20 items-center justify-center rounded-full bg-muted">
                <span
                  className="absolute inset-0 rounded-full border border-dashed border-border"
                  aria-hidden
                />
                <ShoppingBag className="size-8 text-muted-foreground" aria-hidden />
              </span>
              <div>
                <p className="font-heading text-xl font-semibold">Your bag is empty</p>
                <p className="mx-auto mt-1.5 max-w-[17rem] text-sm leading-relaxed text-muted-foreground">
                  Add a pair to start your rotation — free shipping over {formatPrice(threshold)}.
                </p>
              </div>
              <div className="flex w-full max-w-xs flex-col items-center gap-3">
                <Button
                  size="lg"
                  className="h-12 w-full rounded-full"
                  render={<Link href="/products" onClick={closeCart} />}
                >
                  Browse shoes <ArrowRight aria-hidden />
                </Button>
                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Truck className="size-3.5" aria-hidden />
                  Free 30-day returns
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Free-shipping progress */}
              <div
                className={cn(
                  "shrink-0 border-b px-4 py-3 transition-colors md:px-6",
                  freeShipping ? "bg-emerald-500/5" : "bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-2 text-xs font-medium">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full",
                        freeShipping
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-background text-muted-foreground"
                      )}
                    >
                      {freeShipping ? (
                        <CheckCircle2 className="size-3.5" aria-hidden />
                      ) : (
                        <Truck className="size-3.5" aria-hidden />
                      )}
                    </span>
                    {remaining > 0 ? (
                      <span className="truncate">
                        Add <strong className="font-semibold">{formatPrice(remaining)}</strong> for
                        free shipping
                      </span>
                    ) : (
                      <span className="truncate text-emerald-600">Free shipping unlocked</span>
                    )}
                  </p>
                  <span className="shrink-0 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {progress}%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Progress to free shipping"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
                >
                  <span
                    className={cn(
                      "block h-full rounded-full transition-[width] duration-500 ease-out",
                      freeShipping ? "bg-emerald-500" : "bg-foreground"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch] md:px-5 md:py-5">
                <ul className="flex flex-col gap-3">
                  {lines.map((line) => {
                    const atMin = line.quantity <= 1;

                    return (
                      <li
                        key={line.key}
                        className="group flex gap-3 rounded-2xl border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/35 md:gap-3.5 md:p-3"
                      >
                        <Link
                          href={`/products/${line.slug}`}
                          onClick={closeCart}
                          className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-muted md:size-20"
                        >
                          <Image
                            src={line.image}
                            alt={line.name}
                            fill
                            sizes="(max-width: 768px) 72px, 80px"
                            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                {line.brand}
                              </p>
                              <Link
                                href={`/products/${line.slug}`}
                                onClick={closeCart}
                                className="line-clamp-2 text-sm leading-snug font-medium hover:underline"
                              >
                                {line.name}
                              </Link>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                <span className="rounded-full border bg-background px-2 py-0.5 text-[10px] font-medium">
                                  Size {line.size}
                                </span>
                                {line.quantity > 1 && (
                                  <span className="text-[11px]">
                                    {formatPrice(line.price)} each
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="shrink-0 text-sm font-semibold tabular-nums">
                              {formatPrice(line.price * line.quantity)}
                            </p>
                          </div>

                          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                            <div
                              role="group"
                              aria-label={`Quantity for ${line.name}`}
                              className="flex items-center rounded-full border bg-background"
                            >
                              <button
                                aria-label={`Decrease quantity of ${line.name}`}
                                disabled={atMin}
                                className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:active:scale-100 md:size-8"
                                onClick={() => setQuantity(line.key, line.quantity - 1)}
                              >
                                <Minus className="size-3.5" aria-hidden />
                              </button>
                              <span
                                aria-live="polite"
                                className="w-7 text-center text-sm font-medium tabular-nums"
                              >
                                {line.quantity}
                              </span>
                              <button
                                aria-label={`Increase quantity of ${line.name}`}
                                className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-95 md:size-8"
                                onClick={() => setQuantity(line.key, line.quantity + 1)}
                              >
                                <Plus className="size-3.5" aria-hidden />
                              </button>
                            </div>

                            <button
                              aria-label={`Remove ${line.name} from bag`}
                              title="Remove"
                              className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none active:scale-95 md:size-8"
                              onClick={() => {
                                removeLine(line.key);
                                toast("Removed from bag", {
                                  description: line.name,
                                  action: {
                                    label: "Undo",
                                    onClick: () => restoreLines([line]),
                                  },
                                });
                              }}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <footer className="shrink-0 border-t bg-popover/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:px-6 md:pt-5 md:pb-6">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-heading text-xl font-semibold tabular-nums">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Shipping & taxes calculated at checkout.
                </p>
                <Button
                  size="lg"
                  className="mt-3 h-12 w-full rounded-full text-[15px] shadow-sm"
                  render={<Link href="/checkout" onClick={closeCart} />}
                >
                  Checkout · {formatPrice(subtotal)} <ArrowRight aria-hidden />
                </Button>
                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Lock className="size-3" aria-hidden /> Secure checkout
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <RotateCcw className="size-3" aria-hidden /> 30-day returns
                  </span>
                  <Link
                    href="/cart"
                    onClick={closeCart}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    View full bag
                  </Link>
                </div>
              </footer>
            </>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
