import { cn } from "@/lib/utils";

export function SectionHeading({
  kicker,
  title,
  action,
  className,
}: {
  kicker?: string;
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4", className)}>
      <div>
        {kicker && (
          <p className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            {kicker}
          </p>
        )}
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
