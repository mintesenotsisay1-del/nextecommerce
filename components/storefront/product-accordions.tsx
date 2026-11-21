"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Truck, Ship, Wrench } from "lucide-react";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductAccordions({ product }: { product: Product }) {
  const { settings } = useSiteSettings();
  const shipping =
    settings.freeShippingThreshold > 0
      ? `Free express shipping on orders over ${formatPrice(settings.freeShippingThreshold)} — a flat delivery fee applies below that.`
      : "Free express shipping on every order.";

  return (
    <Accordion
      className="mt-10 rounded-3xl border bg-card px-5"
      defaultValue={["details"]}
    >
      <AccordionItem value="details" className="border-b">
        <AccordionTrigger>Specification</AccordionTrigger>
        <AccordionContent>
          <ul className="grid gap-2 py-1 sm:grid-cols-2">
            {product.details.map((d) => (
              <li key={d} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground" aria-hidden />
                {d}
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="shipping" className="border-b">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <Truck className="size-4" aria-hidden /> Shipping & returns
          </span>
        </AccordionTrigger>
        <AccordionContent className="text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Ship className="mt-0.5 size-4 shrink-0" aria-hidden />
            {shipping} Orders placed before 2 pm ship the same day from our local warehouse.
          </p>
          <p className="mt-2">
            Not perfect? Return within 30 days — worn or unworn. Prepaid label included in every box.
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="care" className="border-b-0">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <Wrench className="size-4" aria-hidden /> Care instructions
          </span>
        </AccordionTrigger>
        <AccordionContent className="text-sm text-muted-foreground">{product.care}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
