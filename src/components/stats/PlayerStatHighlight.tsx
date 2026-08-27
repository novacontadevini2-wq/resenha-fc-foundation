import type { LucideIcon } from "lucide-react";

export function PlayerStatHighlight({ icon: Icon, title, name, detail }: { icon: LucideIcon; title: string; name: string; detail: string }) {
  return <article className="card-surface p-4"><Icon className="size-5 text-orange" /><p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</p><h3 className="mt-1 font-display text-lg font-bold text-navy">{name}</h3><p className="text-meta mt-1">{detail}</p></article>;
}
