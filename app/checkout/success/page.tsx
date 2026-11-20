import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  Package,
  RotateCcw,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

type SearchParams = Promise<{ order?: string; total?: string }>;

/** Reads order info set by the checkout page via query params. */
export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { order: orderId, total } = await searchParams;
  const totalNum = total ? Number(total) : null;
  const displayId = orderId ?? "DEMO-001";

  const timeline = [
    {
      icon: CheckCircle2,
      label: "Order confirmed",
      description: "We've received your order.",
      done: true,
    },
    {
      icon: Package,
      label: "Packing",
      description: "Authenticity inspected & boxed.",
      done: false,
    },
    {
      icon: Truck,
      label: "On its way",
      description: "2–4 business days tracked delivery.",
      done: false,
    },
    {
      icon: BadgeCheck,
      label: "Delivered",
      description: "Enjoy your new pair.",
      done: false,
    },
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16">

      {/* ── Hero ── */}
      <div className="flex flex-col items-center text-center">
        {/* Animated ring + check */}
        <span className="relative flex size-20 items-center justify-center sm:size-24">
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20"
            style={{ animationDuration: "1.4s", animationIterationCount: 1 }}
          />
          <span className="relative flex size-full items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="size-10 text-emerald-600 sm:size-12" aria-hidden />
          </span>
        </span>

        <h1 className="font-heading mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
          You&rsquo;re all set!
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {isSupabaseConfigured()
            ? "Your order is confirmed and being prepared. A confirmation email is on its way."
            : "Order placed in demo mode. Connect Supabase to persist real orders."}
        </p>
      </div>

      {/* ── Order reference card ── */}
      <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
        {/* Coloured top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-400" aria-hidden />

        <div className="flex flex-col gap-4 p-5 sm:p-6">
          {/* ID + amount row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                Order reference
              </p>
              <p className="font-heading mt-0.5 text-lg font-semibold tracking-tight">
                {displayId}
              </p>
            </div>
            {totalNum !== null && (
              <div className="text-right">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Total paid
                </p>
                <p className="font-heading mt-0.5 text-lg font-semibold text-emerald-600">
                  ${totalNum.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Delivery estimate */}
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3.5 py-3">
            <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-xs text-muted-foreground">
              Estimated arrival:{" "}
              <span className="font-medium text-foreground">2–4 business days</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Fulfilment timeline ── */}
      <div className="mt-5 rounded-2xl border bg-card p-5 sm:p-6">
        <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          What happens next
        </p>
        <ol className="relative flex flex-col gap-0">
          {timeline.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === timeline.length - 1;
            return (
              <li key={step.label} className="relative flex gap-4">
                {/* Vertical connector */}
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute top-8 left-[1.1rem] h-[calc(100%-1rem)] w-px bg-border"
                  />
                )}
                {/* Icon */}
                <span
                  className={`relative z-10 mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border ${
                    step.done
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                {/* Text */}
                <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
                  <p
                    className={`text-sm font-medium ${
                      step.done ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                    {step.done && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Done
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── Trust strip ── */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { icon: BadgeCheck, label: "Authenticity guaranteed" },
          { icon: RotateCcw, label: "30-day free returns" },
          { icon: Truck, label: "Tracked delivery" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/40 p-3 text-center"
          >
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            <p className="text-[10px] leading-tight text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* ── CTAs ── */}
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:gap-3">
        <Button
          size="lg"
          className="h-12 w-full justify-center rounded-full text-[15px] sm:flex-1"
          render={<Link href="/account" />}
        >
          Track my order <ArrowRight className="size-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full justify-center rounded-full text-[15px] sm:flex-1"
          render={<Link href="/products" />}
        >
          Keep shopping
        </Button>
      </div>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
        Questions? Email us at{" "}
        <a
          href="mailto:care@soleandstone.com"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          care@soleandstone.com
        </a>
      </p>
    </div>
  );
}
