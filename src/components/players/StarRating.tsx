import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function StarRating({ value, className }: { value: number; className?: string }) {
  const rounded = Math.round(value);
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`Avaliação ${value} de 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "size-4",
            index < rounded ? "fill-orange text-orange" : "text-border",
          )}
        />
      ))}
    </div>
  );
}
