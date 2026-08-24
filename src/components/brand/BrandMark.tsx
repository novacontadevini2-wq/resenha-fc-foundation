import { cn } from "@/lib/utils";
import { CLUB } from "@/lib/club-config";

interface BrandMarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  withName?: boolean;
  tone?: "light" | "dark";
}

const sizes = {
  sm: { badge: "h-9 w-9 text-[11px]", name: "text-base" },
  md: { badge: "h-12 w-12 text-sm", name: "text-xl" },
  lg: { badge: "h-20 w-20 text-lg", name: "text-3xl" },
};

export function BrandMark({ size = "md", className, withName = true, tone = "dark" }: BrandMarkProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border-2 border-orange bg-navy-deep font-display font-bold uppercase tracking-wide text-orange",
          s.badge,
        )}
        aria-hidden
      >
        RFC
      </div>
      {withName ? (
        <div className="leading-tight">
          <p
            className={cn(
              "font-display font-bold uppercase",
              s.name,
              tone === "light" ? "text-navy-foreground" : "text-foreground",
            )}
          >
            {CLUB.shortName}
          </p>
          <p
            className={cn(
              "text-[11px] uppercase tracking-[0.18em]",
              tone === "light" ? "text-navy-foreground/70" : "text-muted-foreground",
            )}
          >
            Futebol Clube
          </p>
        </div>
      ) : null}
    </div>
  );
}
