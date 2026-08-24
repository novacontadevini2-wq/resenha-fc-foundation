import { cn } from "@/lib/utils";
import { CLUB } from "@/lib/club-config";

interface BrandMarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  withName?: boolean;
  tone?: "light" | "dark";
}

const sizes = {
  sm: { badge: "size-9", name: "text-base" },
  md: { badge: "size-12", name: "text-xl" },
  lg: { badge: "size-20", name: "text-3xl" },
};

export function BrandMark({ size = "md", className, withName = true, tone = "dark" }: BrandMarkProps) {
  const s = sizes[size];
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "shrink-0 overflow-hidden rounded-full border-2 border-orange bg-navy-deep",
          s.badge,
        )}
      >
        <img
          src="/logotipo%20resenha%20fc.png"
          alt={`${CLUB.fullName} — logotipo`}
          className="size-full object-cover"
        />
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
