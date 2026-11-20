"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  alt: string;
};

/**
 * Product gallery, modern mobile-first:
 * — Mobile (< sm): full-bleed swipe carousel (scroll-snap) with dots + counter.
 * — lg+: lift-up thumbnails, hover zoom, prev/next arrows, synced index.
 * The active index is driven by scroll position, so thumbs/dots/counter and
 * the swipe gesture all stay in sync through one source of truth.
 */
export function ProductGallery({ images, alt }: Props) {
  const [active, setActive] = React.useState(0);
  const activeRef = React.useRef(0);
  const [zoom, setZoom] = React.useState(false);
  const [origin, setOrigin] = React.useState("50% 50%");
  const trackRef = React.useRef<HTMLDivElement>(null);
  const hoverRef = React.useRef<boolean | null>(null);

  /** Zoom only applies to real pointers; touch taps emit synthetic mouse events. */
  function hoverCapable(): boolean {
    if (hoverRef.current === null) {
      hoverRef.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    }
    return hoverRef.current;
  }

  function scrollToIndex(i: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  }

  // Scroll → index (event callback, not an effect)
  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    const clamped = Math.max(0, Math.min(images.length - 1, i));
    if (clamped !== activeRef.current) {
      activeRef.current = clamped;
      setActive(clamped);
    }
  }

  function activeMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row-reverse lg:items-start">
      {/* Thumbs — desktop only, on the left */}
      <div className="hidden shrink-0 basis-16 flex-col gap-2 lg:flex">
        {images.map((src, i) => (
          <button
            key={src + i}
            onClick={() => scrollToIndex(i)}
            aria-label={`Show view ${i + 1}`}
            aria-pressed={i === active}
            className={cn(
              "relative aspect-square w-full overflow-hidden rounded-xl bg-muted ring-offset-2 ring-offset-background transition-all",
              i === active
                ? "ring-2 ring-foreground"
                : "ring-1 ring-border opacity-80 hover:opacity-100 hover:ring-foreground/40"
            )}
          >
            <Image src={src} alt="" fill sizes="64px" className="object-cover" />
          </button>
        ))}
      </div>

      {/* Swipeable main stage — full-bleed on phones, rounded on larger screens */}
      <div className="relative flex-1">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          onMouseEnter={() => {
            if (hoverCapable()) setZoom(true);
          }}
          onMouseLeave={() => setZoom(false)}
          onMouseMove={activeMove}
          className="scrollbar-hide -mx-4 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain bg-muted sm:mx-0 sm:rounded-3xl"
          style={{ scrollbarWidth: "none" }}
        >
          {images.map((src, i) => (
            <div
              key={src + i}
              className="relative aspect-square w-full shrink-0 snap-center snap-always overflow-hidden sm:aspect-[4/5]"
            >
              <Image
                src={src}
                alt={`${alt} — view ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 92vw, 40vw"
                className={cn(
                  "object-cover transition-[opacity,scale] duration-500 ease-out",
                  zoom && i === active ? "scale-[1.4]" : "scale-100"
                )}
                style={{ transformOrigin: origin }}
              />
            </div>
          ))}
        </div>

        {/* Counter — mobile */}
        <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-background/80 px-2.5 py-1 font-mono text-[10px] font-semibold text-foreground backdrop-blur lg:hidden">
          {active + 1}/{images.length}
        </span>

        {/* Hover-to-zoom hint — desktop */}
        <span className="pointer-events-none absolute top-4 left-4 hidden rounded-full bg-background/80 px-3 py-1 text-[10px] font-semibold tracking-wider uppercase backdrop-blur lg:inline-block">
          Hover to zoom
        </span>

        {/* Dots — mobile over image */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden">
          {images.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to view ${i + 1}`}
              aria-current={i === active}
              onClick={(e) => {
                e.stopPropagation();
                scrollToIndex(i);
              }}
              className={cn(
                "pointer-events-auto size-1.5 rounded-full transition-all",
                i === active ? "w-4 bg-white shadow-sm" : "bg-white/60"
              )}
            />
          ))}
        </div>

        {/* Arrows — desktop */}
        <div className="absolute inset-y-0 left-0 hidden items-center pl-3 lg:flex">
          <button
            aria-label="Previous view"
            disabled={active === 0}
            onClick={() => scrollToIndex(active - 1)}
            className="flex size-10 items-center justify-center rounded-full border bg-background/90 shadow-sm backdrop-blur transition-all hover:bg-background disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
        </div>
        <div className="absolute inset-y-0 right-0 hidden items-center pr-3 lg:flex">
          <button
            aria-label="Next view"
            disabled={active === images.length - 1}
            onClick={() => scrollToIndex(active + 1)}
            className="flex size-10 items-center justify-center rounded-full border bg-background/90 shadow-sm backdrop-blur transition-all hover:bg-background disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
