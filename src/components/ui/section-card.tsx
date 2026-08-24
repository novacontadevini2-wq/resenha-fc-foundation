import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function SectionCard({ title, icon: Icon, action, children, className }: SectionCardProps) {
  return (
    <section className={cn("card-surface p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon ? (
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-navy">
              <Icon className="size-4" />
            </span>
          ) : null}
          <h2 className="text-subtitle text-navy">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
