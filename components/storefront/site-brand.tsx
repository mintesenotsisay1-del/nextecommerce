"use client";

import * as React from "react";
import { useSiteSettings } from "@/components/providers/site-settings-provider";

/** Renders the editable company name with a muted ampersand accent. */
export function BrandName({
  name,
  accentClassName = "text-muted-foreground",
}: {
  name: string;
  accentClassName?: string;
}) {
  const parts = name.split(/(&)/g);

  return (
    <>
      {parts.map((part, index) =>
        part === "&" ? (
          <span key={`amp-${index}`} className={accentClassName}>
            &
          </span>
        ) : (
          <React.Fragment key={`part-${index}`}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/** Company name from the live settings context. */
export function SiteBrand({ className }: { className?: string }) {
  const { settings } = useSiteSettings();

  return (
    <span className={className}>
      <BrandName name={settings.companyName} />
    </span>
  );
}
