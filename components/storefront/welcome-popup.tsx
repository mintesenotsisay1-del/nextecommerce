"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, Gift, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSiteSettings } from "@/components/providers/site-settings-provider";

/** Once a visitor has seen the offer it never interrupts them again. */
const WELCOME_POPUP_SEEN_KEY = "sole-stone-welcome-popup-seen-v1";

/** Checkout, auth and admin flows should never be covered by a marketing popup. */
const SUPPRESSED_PREFIXES = ["/admin", "/checkout", "/auth"];

/**
 * Admin-controlled welcome offer. It is shown once per browser to new
 * visitors after a short delay, and only when the popup is enabled in
 * Storefront settings. Closing it — by button, X, Escape or the backdrop —
 * counts as seen.
 */
export function WelcomePopup() {
  const { settings, hydrated } = useSiteSettings();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const popup = settings.welcomePopup;

  React.useEffect(() => {
    if (!hydrated || !popup.enabled) return;
    if (pathname && SUPPRESSED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return;
    }

    try {
      if (window.localStorage.getItem(WELCOME_POPUP_SEEN_KEY)) return;
    } catch {
      // Storage blocked — still show the offer for this visit.
    }

    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(WELCOME_POPUP_SEEN_KEY, "1");
      } catch {
        // Non-fatal: the popup still opens for this page view.
      }
      setOpen(true);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [hydrated, pathname, popup.enabled]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setCopied(false);
  }

  async function copyCode() {
    if (!popup.code) return;

    try {
      await navigator.clipboard.writeText(popup.code);
      setCopied(true);
      toast.success("Discount code copied", { description: popup.code });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the code", {
        description: `Select and copy ${popup.code} manually.`,
      });
    }
  }

  function startShopping() {
    setOpen(false);
    if (/^https?:\/\//i.test(popup.ctaHref)) {
      window.location.assign(popup.ctaHref);
      return;
    }
    router.push(popup.ctaHref);
  }

  return (
    <Dialog open={open && popup.enabled} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <div className="relative overflow-hidden bg-foreground px-6 pt-9 pb-8 text-center text-background">
          <span
            aria-hidden
            className="absolute -top-16 -right-14 size-40 rounded-full bg-background/10"
          />
          <span
            aria-hidden
            className="absolute -bottom-20 -left-12 size-40 rounded-full bg-background/5"
          />

          <DialogClose
            aria-label="Close welcome offer"
            className="absolute top-2.5 right-2.5 z-10 flex size-8 items-center justify-center rounded-full text-background/60 transition-colors hover:bg-background/10 hover:text-background focus-visible:ring-2 focus-visible:ring-background/50 focus-visible:outline-none"
          >
            <X className="size-4" aria-hidden />
          </DialogClose>

          <span className="relative mx-auto flex size-12 items-center justify-center rounded-full bg-background/10 ring-1 ring-background/20">
            <Gift className="size-6" aria-hidden />
          </span>
          <p className="relative mt-3 text-[10px] font-semibold tracking-[0.18em] text-background/60 uppercase">
            Welcome offer
          </p>
          <DialogTitle className="font-heading relative mt-1 text-2xl leading-tight font-semibold text-balance text-background">
            {popup.title}
          </DialogTitle>
          {popup.description && (
            <DialogDescription className="relative mx-auto mt-2 max-w-xs text-sm leading-relaxed text-background/70">
              {popup.description}
            </DialogDescription>
          )}
        </div>

        <div className="grid gap-4 p-5">
          {popup.code && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/40 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Your code
                </p>
                <p className="truncate font-mono text-lg font-semibold tracking-wider">
                  {popup.code}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-full"
                onClick={() => void copyCode()}
              >
                {copied ? (
                  <Check className="text-emerald-600" data-icon="inline-start" aria-hidden />
                ) : (
                  <Copy data-icon="inline-start" aria-hidden />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="w-full rounded-full sm:flex-1"
              onClick={startShopping}
            >
              {popup.ctaLabel} <ArrowRight aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              No thanks
            </Button>
          </div>

          <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
            One use per customer. Cannot be combined with other offers.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
