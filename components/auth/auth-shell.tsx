import type { ReactNode } from "react";
import Image from "next/image";

type AuthShellProps = {
  children: ReactNode;
  imageSrc: string;
  imageAlt: string;
  quote: string;
  attribution: string;
};

/** Shared two-column frame for the sign-in and sign-up pages. */
export function AuthShell({
  children,
  imageSrc,
  imageAlt,
  quote,
  attribution,
}: AuthShellProps) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 pt-6 pb-0 sm:px-6 sm:pt-8 md:pb-8 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:py-12">
      <div className="mx-auto flex w-full max-w-md flex-col">{children}</div>

      <aside className="hidden lg:flex">
        <div className="relative h-[560px] w-full overflow-hidden rounded-3xl bg-muted xl:h-[620px]">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            loading="eager"
            sizes="(min-width: 1024px) 45vw, 1px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <blockquote className="absolute right-8 bottom-8 left-8">
            <p className="font-heading text-2xl leading-snug font-semibold text-white">
              {quote}
            </p>
            <footer className="mt-2 text-xs text-white/70">{attribution}</footer>
          </blockquote>
        </div>
      </aside>
    </div>
  );
}
