import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";

import { MatchStatusBadge } from "@/components/matches/MatchStatusBadge";
import type { Match, MatchStatus } from "@/types";

export interface MatchCardData extends Match {
  roundLabel: string;
  teamALabel: string;
  teamBLabel: string;
}

export function MatchCard({
  match,
  admin = false,
  onOpen,
  onDelete,
}: {
  match: MatchCardData;
  admin?: boolean;
  onOpen?: () => void;
  onDelete?: () => void;
}) {
  const isFinished = match.status === "finished";
  const winner =
    isFinished && match.score_a !== match.score_b
      ? match.score_a > match.score_b
        ? "a"
        : "b"
      : null;
  const dateLabel = match.scheduled_at
    ? new Date(match.scheduled_at).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : match.roundLabel;
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-meta">{dateLabel}</p>
        <MatchStatusBadge status={match.status as MatchStatus} />
      </div>
      <div className="match-score-grid mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-center">
        <strong
          className={
            winner === "a"
              ? "min-w-0 break-words font-display text-lg font-bold text-orange"
              : "min-w-0 break-words font-display text-lg font-bold text-navy"
          }
        >
          {match.teamALabel}
        </strong>
        <div className="flex items-center gap-2 font-display text-3xl font-bold text-navy">
          <span>{match.status === "scheduled" || match.status === "cancelled" ? "-" : match.score_a}</span>
          <span className="text-lg text-muted-foreground">x</span>
          <span>{match.status === "scheduled" || match.status === "cancelled" ? "-" : match.score_b}</span>
        </div>
        <strong
          className={
            winner === "b"
              ? "min-w-0 break-words font-display text-lg font-bold text-orange"
              : "min-w-0 break-words font-display text-lg font-bold text-navy"
          }
        >
          {match.teamBLabel}
        </strong>
      </div>
      <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {admin ? `${match.roundLabel} · Abrir detalhes` : match.roundLabel}
      </p>
    </>
  );

  return (
    <div className="card-surface relative p-4">
      {onDelete ? (
        <button
          type="button"
          aria-label="Excluir partida"
          title="Excluir partida"
          onClick={onDelete}
          className="absolute right-3 top-3 z-10 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="block w-full text-left transition-transform hover:-translate-y-0.5"
        >
          {content}
        </button>
      ) : (
        <Link
          to="/app/partidas/$id"
          params={{ id: match.id }}
          className="block transition-transform hover:-translate-y-0.5"
        >
          {content}
        </Link>
      )}
      <div className="mt-3 text-center">
        <Link
          to="/app/partidas/$id"
          params={{ id: match.id }}
          className="text-xs font-semibold text-orange hover:underline"
        >
          Ver página completa
        </Link>
      </div>
    </div>
  );
}
