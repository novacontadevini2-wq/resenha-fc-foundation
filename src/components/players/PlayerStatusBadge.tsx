import { Badge } from "@/components/ui/badge";
import type { PlayerStatus } from "@/types";

const statusLabels: Record<PlayerStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
};

export function PlayerStatusBadge({ status }: { status: PlayerStatus }) {
  return (
    <Badge variant={status === "active" ? "secondary" : "outline"} className={status === "active" ? "bg-accent text-navy" : "text-muted-foreground"}>
      {statusLabels[status] ?? "Indefinido"}
    </Badge>
  );
}

export { statusLabels };
