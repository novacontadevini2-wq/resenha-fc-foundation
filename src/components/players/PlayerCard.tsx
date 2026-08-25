import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/players/StarRating";
import type { Player } from "@/types";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function PlayerCard({
  player,
  positions = [],
}: {
  player: Player;
  positions?: string[];
}) {
  return (
    <Link to="/app/jogadores/$id" params={{ id: player.id }} className="card-surface flex items-center gap-4 p-4 transition-transform hover:-translate-y-0.5">
      <Avatar className="size-14 border-2 border-accent">
        <AvatarImage src={player.photo_url ?? undefined} alt={player.name} />
        <AvatarFallback className="bg-navy text-navy-foreground font-display">
          {initials(player.nickname || player.name)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-display text-lg font-semibold text-navy">
            {player.nickname || player.name}
          </h3>
          {player.shirt_number != null ? (
            <span className="shrink-0 rounded-md bg-navy px-1.5 py-0.5 text-[11px] font-bold text-navy-foreground">
              #{player.shirt_number}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {positions.length > 0 ? (
            positions.map((position) => (
              <Badge key={position} variant="secondary" className="bg-accent text-navy">
                {position}
              </Badge>
            ))
          ) : (
            <span className="text-meta">Posição não definida</span>
          )}
        </div>
        <StarRating value={player.overall_rating} className="mt-1.5" />
      </div>
      {player.status !== "active" ? <span className="shrink-0 text-xs font-semibold uppercase text-muted-foreground">{player.status === "suspended" ? "Suspenso" : "Inativo"}</span> : null}
    </Link>
  );
}
