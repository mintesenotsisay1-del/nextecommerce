"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { cn } from "@/lib/utils";

/**
 * Admin-controlled announcement strip above the header. Dismissal is tracked
 * per message, so publishing a new announcement shows it again.
 */
export function AnnouncementBanner() {
  const { settings } = useSiteSettings();
  const [dismissedMessage, setDismissedMessage] = React.useState<string | null>(null);
  const banner = settings.banner;
  const dismissible = banner.dismissible;

  if (!banner.enabled) return null;
  if (dismissible && dismissedMessage === banner.message) return null;

  const content = (
    <span className="line-clamp-2">{banner.message}</span>
  );

  return (
    <div className="relative bg-foreground text-background">
      <div
        className={cn(
          "mx-auto flex min-h-9 max-w-7xl items-center justify-center py-2 text-center text-[10px] font-semibold tracking-[0.14em] uppercase sm:text-[11px]",
          dismissible ? "px-10" : "px-4"
        )}
      >
        {banner.href ? (
          <Link
            href={banner.href}
            className="underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
          >
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissedMessage(banner.message)}
          aria-label="Dismiss announcement"
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-background/70 transition-colors hover:bg-background/10 hover:text-background"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
