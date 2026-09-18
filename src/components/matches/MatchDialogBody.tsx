import { Link } from "@tanstack/react-router";
import { Flag, Trash2 } from "lucide-react";
import type { FormEvent } from "react";

import type { MatchCardData } from "@/components/matches/MatchCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MatchTimer } from "@/components/matches/MatchTimer";
import type { MatchGoal, MatchStatus } from "@/types";

export type DialogTeamPlayer = { team_id: string; player_id: string; player_name_snapshot: string };

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "Agendada",
  in_progress: "Em andamento",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

export function MatchDialogBody({
  match,
  isAdmin,
  saving,
  onChangeStatus,
  onCancelMatch,
  players,
  goals,
  goalTeam,
  goalPlayer,
  goalAssist,
  goalMinute,
  onGoalTeam,
  onGoalPlayer,
  onGoalAssist,
  onGoalMinute,
  onSaveGoal,
  onRemoveGoal,
}: {
  match: MatchCardData;
  isAdmin: boolean;
  saving: boolean;
  onChangeStatus: (action: "start_match" | "finish_match") => void;
  onCancelMatch: () => void;
  players: DialogTeamPlayer[];
  goals: MatchGoal[];
  goalTeam: string;
  goalPlayer: string;
  goalAssist: string;
  goalMinute: string;
  onGoalTeam: (value: string) => void;
  onGoalPlayer: (value: string) => void;
  onGoalAssist: (value: string) => void;
  onGoalMinute: (value: string) => void;
  onSaveGoal: (event: FormEvent) => void;
  onRemoveGoal: (goal: MatchGoal) => void;
}) {
  const teamPlayers = players.filter((player) => player.team_id === goalTeam);
  const playerName = (playerId: string) =>
    players.find((player) => player.player_id === playerId)?.player_name_snapshot ?? "Jogador";
  const canEdit = isAdmin && match.status !== "cancelled";

  return (
    <div className="grid gap-4 text-sm">
      <p>
        <strong>Data e horário:</strong>{" "}
        {match.scheduled_at ? new Date(match.scheduled_at).toLocaleString("pt-BR") : "Não informado"}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <p>
          <strong>Situação:</strong>{" "}
          {MATCH_STATUS_LABEL[match.status as MatchStatus] ?? match.status}
        </p>
        <MatchTimer
          status={match.status}
          startedAt={match.started_at}
          finishedAt={match.finished_at}
        />
      </div>
      <p>
        <strong>Placar:</strong> {match.teamALabel} {match.score_a} x {match.score_b}{" "}
        {match.teamBLabel}
      </p>

      {canEdit ? (
        <>
          <p className="text-muted-foreground">
            O placar é atualizado automaticamente ao registrar ou remover gols.
          </p>



          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onChangeStatus("start_match")}
              disabled={saving || match.status !== "scheduled"}
            >
              <Flag /> Em andamento
            </Button>
            <Button
              type="button"
              onClick={() => onChangeStatus("finish_match")}
              disabled={saving || match.status !== "in_progress"}
            >
              <Flag /> Finalizar partida
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onCancelMatch}
              disabled={saving || match.status === "finished"}
            >
              Cancelar partida
            </Button>
          </div>

          <form onSubmit={onSaveGoal} className="grid gap-2 border-t pt-3">
            <strong>Adicionar gol</strong>
            <Select
              value={goalTeam}
              onValueChange={(value) => {
                onGoalTeam(value);
                onGoalPlayer("");
                onGoalAssist("none");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Equipe que marcou" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={match.team_a_id}>{match.teamALabel}</SelectItem>
                <SelectItem value={match.team_b_id}>{match.teamBLabel}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={goalPlayer} onValueChange={onGoalPlayer} disabled={!goalTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Jogador que marcou" />
              </SelectTrigger>
              <SelectContent>
                {teamPlayers.map((player) => (
                  <SelectItem key={player.player_id} value={player.player_id}>
                    {player.player_name_snapshot}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={goalAssist} onValueChange={onGoalAssist} disabled={!goalPlayer}>
              <SelectTrigger>
                <SelectValue placeholder="Assistência (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem assistência</SelectItem>
                {teamPlayers
                  .filter((player) => player.player_id !== goalPlayer)
                  .map((player) => (
                    <SelectItem key={player.player_id} value={player.player_id}>
                      {player.player_name_snapshot}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="Minuto (opcional)"
              value={goalMinute}
              onChange={(event) => onGoalMinute(event.target.value)}
            />
            <Button type="submit" disabled={saving}>
              Registrar gol
            </Button>
          </form>
        </>
      ) : null}

      <div className="grid gap-1 border-t pt-3">
        <strong>Gols registrados</strong>
        {goals.length ? (
          goals.map((goal) => (
            <div key={goal.id} className="flex items-center justify-between gap-2">
              <span>
                {goal.minute !== null ? `${goal.minute}' ` : ""}
                {playerName(goal.player_id)} ·{" "}
                {goal.team_id === match.team_a_id ? match.teamALabel : match.teamBLabel}
              </span>
              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label="Remover gol"
                  onClick={() => onRemoveGoal(goal)}
                  disabled={saving}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          ))
        ) : (
          <span className="text-muted-foreground">Nenhum gol registrado.</span>
        )}
      </div>

      <Link
        to="/app/partidas/$id"
        params={{ id: match.id }}
        className="text-sm font-semibold text-orange hover:underline"
      >
        Abrir página completa da partida
      </Link>
    </div>
  );
}
