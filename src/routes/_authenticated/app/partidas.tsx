import { createFileRoute } from "@tanstack/react-router";
import { Flag, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { MatchCard, type MatchCardData } from "@/components/matches/MatchCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Draw, Match, MatchGoal, MatchStatus, MatchTeam, Round } from "@/types";

type DrawSummary = Pick<Draw, "id" | "round_id" | "status">;
type TeamPlayer = { team_id: string; player_id: string; player_name_snapshot: string };

export const Route = createFileRoute("/_authenticated/app/partidas")({
  head: () => ({ meta: [{ title: "Partidas | Resenha FC" }] }),
  component: MatchesPage,
});

function MatchesPage() {
  const { isAdmin } = useAuth();
  const [matches, setMatches] = useState<MatchCardData[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [draws, setDraws] = useState<DrawSummary[]>([]);
  const [teams, setTeams] = useState<MatchTeam[]>([]);
  const [roundFilter, setRoundFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [roundId, setRoundId] = useState("");
  const [drawId, setDrawId] = useState("");
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [tournaments, setTournaments] = useState<{ id: string; name: string; season_id: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openedMatch, setOpenedMatch] = useState<MatchCardData | null>(null);
  const [openedScoreA, setOpenedScoreA] = useState("");
  const [openedScoreB, setOpenedScoreB] = useState("");
  const [openedPlayers, setOpenedPlayers] = useState<TeamPlayer[]>([]);
  const [openedGoals, setOpenedGoals] = useState<MatchGoal[]>([]);
  const [openedGoalTeam, setOpenedGoalTeam] = useState("");
  const [openedGoalPlayer, setOpenedGoalPlayer] = useState("");
  const [openedGoalMinute, setOpenedGoalMinute] = useState("");

  async function loadMatches() {
    setLoading(true);
    const [
      { data: matchData, error: matchError },
      { data: roundData, error: roundError },
      { data: drawData },
      { data: tournamentData },
    ] = await Promise.all([
      supabase
        .from("matches")
        .select("*")
        .order("scheduled_at", { ascending: true, nullsFirst: false }),
      supabase.from("rounds").select("*").order("scheduled_date", { ascending: true }),
      supabase.from("draws").select("id, round_id, status").eq("status", "confirmed"),
      supabase
        .from("tournaments")
        .select("id, name, season_id")
        .in("status", ["planned", "active"]),
    ]);
    if (matchError || roundError) {
      setError(true);
      setLoading(false);
      return;
    }
    const nextRounds = (roundData ?? []) as Round[];
    const nextMatches = (matchData ?? []) as Match[];
    const nextDraws = (drawData ?? []) as DrawSummary[];
    const teamIds = [
      ...new Set(nextMatches.flatMap((match) => [match.team_a_id, match.team_b_id])),
    ];
    const drawIds = nextDraws.map((draw) => draw.id);
    const [{ data: matchTeamData }, { data: drawTeamData }] = await Promise.all([
      teamIds.length
      ? supabase
          .from("draw_teams")
          .select("id, draw_id, team_number, total_rating")
          .in("id", teamIds)
      : { data: [] },
      drawIds.length
        ? supabase
            .from("draw_teams")
            .select("id, draw_id, team_number, total_rating")
            .in("draw_id", drawIds)
        : Promise.resolve({ data: [] }),
    ]);
    const allTeams = [...((matchTeamData ?? []) as MatchTeam[]), ...((drawTeamData ?? []) as MatchTeam[])];
    const uniqueTeams = [...new Map(allTeams.map((team) => [team.id, team])).values()];
    const teamMap = new Map(uniqueTeams.map((team) => [team.id, team]));
    const roundMap = new Map(nextRounds.map((round) => [round.id, round]));
    setRounds(nextRounds);
    setDraws(nextDraws);
    setTournaments(tournamentData ?? []);
    setTeams(uniqueTeams);
    setMatches(
      nextMatches.map((match) => ({
        ...match,
        roundLabel: formatRound(roundMap.get(match.round_id)),
        teamALabel: teamLabel(teamMap.get(match.team_a_id)),
        teamBLabel: teamLabel(teamMap.get(match.team_b_id)),
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    void loadMatches();
  }, []);

  const selectedDraws = useMemo(
    () => draws.filter((draw) => !roundId || draw.round_id === roundId),
    [draws, roundId],
  );
  const selectedTeams = useMemo(
    () => teams.filter((team) => team.draw_id === drawId),
    [teams, drawId],
  );
  const visibleMatches = useMemo(
    () =>
      matches.filter((match) => {
        const date =
          match.scheduled_at?.slice(0, 10) ?? match.roundLabel.split("/").reverse().join("-");
        return (
          (roundFilter === "all" || match.round_id === roundFilter) &&
          (statusFilter === "all" || match.status === statusFilter) &&
          (!dateFilter || date === dateFilter)
        );
      }),
    [dateFilter, matches, roundFilter, statusFilter],
  );

  async function openMatch(match: MatchCardData) {
    setOpenedMatch(match);
    setOpenedScoreA(String(match.score_a));
    setOpenedScoreB(String(match.score_b));
    setOpenedGoalTeam(match.team_a_id);
    setOpenedGoalPlayer("");
    const [{ data: goals, error: goalsError }, { data: players, error: playersError }] = await Promise.all([
      supabase.from("match_goals").select("*").eq("match_id", match.id).order("created_at"),
      supabase.from("draw_team_players").select("team_id, player_id, player_name_snapshot").eq("draw_id", match.draw_id).in("team_id", [match.team_a_id, match.team_b_id]),
    ]);
    if (goalsError || playersError) {
      toast.error((goalsError ?? playersError)?.message ?? "Não foi possível carregar os dados da partida.");
      return;
    }
    setOpenedGoals((goals ?? []) as MatchGoal[]);
    setOpenedPlayers((players ?? []) as TeamPlayer[]);
  }

  async function saveOpenedScore(event: React.FormEvent) {
    event.preventDefault();
    if (!openedMatch) return;
    const scoreA = Number(openedScoreA);
    const scoreB = Number(openedScoreB);
    if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB) || scoreA < 0 || scoreB < 0) {
      toast.error("Informe placares inteiros maiores ou iguais a zero.");
      return;
    }

    async function saveOpenedGoal(event: React.FormEvent) {
      event.preventDefault();
      if (!openedMatch || !openedGoalTeam || !openedGoalPlayer) {
        toast.error("Selecione a equipe e o jogador que marcou.");
        return;
      }
      const minute = openedGoalMinute ? Number(openedGoalMinute) : null;
      if (minute !== null && (!Number.isInteger(minute) || minute < 0)) {
        toast.error("Informe um minuto válido.");
        return;
      }
      setSaving(true);
      const { data: goalId, error: goalError } = await supabase.rpc("register_match_goal_with_assist", {
        p_match_id: openedMatch.id,
        p_player_id: openedGoalPlayer,
        p_team_id: openedGoalTeam,
        ...(minute === null ? {} : { p_minute: minute }),
      });
      setSaving(false);
      if (goalError) {
        toast.error(goalError.message);
        return;
      }
      const player = openedPlayers.find((item) => item.player_id === openedGoalPlayer);
      setOpenedGoals((current) => [...current, { id: goalId, match_id: openedMatch.id, player_id: openedGoalPlayer, team_id: openedGoalTeam, minute, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
      setOpenedScoreA(String(Number(openedScoreA) + (openedGoalTeam === openedMatch.team_a_id ? 1 : 0)));
      setOpenedScoreB(String(Number(openedScoreB) + (openedGoalTeam === openedMatch.team_b_id ? 1 : 0)));
      setOpenedGoalPlayer("");
      setOpenedGoalMinute("");
      toast.success(`Gol de ${player?.player_name_snapshot ?? "jogador"} registrado.`);
    }

    async function changeOpenedStatus(action: "start_match" | "finish_match") {
      if (!openedMatch) return;
      setSaving(true);
      const { error: statusError } = await supabase.rpc(action, { p_match_id: openedMatch.id });
      setSaving(false);
      if (statusError) {
        toast.error(statusError.message);
        return;
      }
      const status: MatchStatus = action === "start_match" ? "in_progress" : "finished";
      setOpenedMatch((current) => current ? { ...current, status } : current);
      setMatches((current) => current.map((match) => match.id === openedMatch.id ? { ...match, status } : match));
      toast.success(action === "start_match" ? "Partida em andamento." : "Partida finalizada.");
    }
    setSaving(true);
    const { error: scoreError } = await supabase.rpc("set_match_score", {
      p_match_id: openedMatch.id,
      p_score_a: scoreA,
      p_score_b: scoreB,
    });
    setSaving(false);
    if (scoreError) {
      toast.error(scoreError.message);
      return;
    }
    setMatches((current) =>
      current.map((match) =>
        match.id === openedMatch.id ? { ...match, score_a: scoreA, score_b: scoreB } : match,
      ),
    );
    setOpenedMatch((current) =>
      current ? { ...current, score_a: scoreA, score_b: scoreB } : current,
    );
    toast.success("Placar atualizado.");
  }

  async function createMatch(event: React.FormEvent) {
    event.preventDefault();
    if (!roundId || !drawId || !teamAId || !teamBId || teamAId === teamBId) {
      toast.error("Selecione rodada, sorteio e duas equipes diferentes.");
      return;
    }
    setSaving(true);
    const { data: matchId, error: createError } = await supabase.rpc("create_match", {
      p_round_id: roundId,
      p_draw_id: drawId,
      p_team_a_id: teamAId,
      p_team_b_id: teamBId,
      ...(scheduledAt ? { p_scheduled_at: new Date(scheduledAt).toISOString() } : {}),
      ...(notes ? { p_notes: notes } : {}),
    });
    setSaving(false);
    if (createError || !matchId)
      toast.error("Não foi possível criar a partida. Verifique a rodada e as equipes.");
    else {
      const attachError =
        tournamentId && tournamentId !== "none"
          ? (
              await supabase.rpc("attach_match_to_tournament", {
                p_match_id: matchId,
                p_tournament_id: tournamentId,
              })
            ).error
          : null;
      if (attachError) toast.error("Partida criada, mas não foi possível vinculá-la ao torneio.");
      else toast.success("Partida criada com sucesso.");
      setRoundId("");
      setDrawId("");
      setTeamAId("");
      setTeamBId("");
      setScheduledAt("");
      setNotes("");
      setTournamentId("");
      await loadMatches();
    }
  }

  return (
    <AppLayout title="Partidas" subtitle="Acompanhe os confrontos e resultados do Resenha FC.">
      {isAdmin ? (
        <SectionCard title="Nova partida" icon={Plus} className="mb-5">
          <form onSubmit={createMatch} className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-navy">
              Torneio (opcional)
              <Select value={tournamentId} onValueChange={setTournamentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem torneio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem torneio</SelectItem>
                  {tournaments.map((tournament) => (
                    <SelectItem key={tournament.id} value={tournament.id}>
                      {tournament.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-navy">
              Rodada
              <Select
                value={roundId}
                onValueChange={(value) => {
                  setRoundId(value);
                  setDrawId("");
                  setTeamAId("");
                  setTeamBId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a rodada" />
                </SelectTrigger>
                <SelectContent>
                  {rounds
                    .filter((round) => round.status !== "cancelled")
                    .map((round) => (
                      <SelectItem key={round.id} value={round.id}>
                        {formatRound(round)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-navy">
              Sorteio confirmado
              <Select
                value={drawId}
                onValueChange={(value) => {
                  setDrawId(value);
                  setTeamAId("");
                  setTeamBId("");
                }}
                disabled={!roundId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o sorteio" />
                </SelectTrigger>
                <SelectContent>
                  {selectedDraws.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      Nenhum sorteio confirmado para esta rodada.
                    </div>
                  ) : (
                    selectedDraws.map((draw) => (
                      <SelectItem key={draw.id} value={draw.id}>
                        Sorteio {draw.id.slice(0, 8)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {roundId && selectedDraws.length === 0 ? (
                <span className="text-meta">
                  Realize e confirme o sorteio na aba Sorteio para liberar as equipes.
                </span>
              ) : null}
            </label>
            <label className="grid gap-1 text-sm font-medium text-navy">
              Equipe A
              <Select value={teamAId} onValueChange={setTeamAId} disabled={!drawId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {selectedTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {teamLabel(team)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-navy">
              Equipe B
              <Select value={teamBId} onValueChange={setTeamBId} disabled={!drawId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {selectedTeams
                    .filter((team) => team.id !== teamAId)
                    .map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {teamLabel(team)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-navy">
              Data e horário
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-navy">
              Observações
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
            <Button disabled={saving || !roundId || !drawId || !teamAId || !teamBId}>
              {saving ? "Salvando..." : "Criar partida"}
            </Button>
          </form>
        </SectionCard>
      ) : null}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-medium text-navy">
          Rodada
          <Select value={roundFilter} onValueChange={setRoundFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as rodadas</SelectItem>
              {rounds.map((round) => (
                <SelectItem key={round.id} value={round.id}>
                  {formatRound(round)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-navy">
          Status
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as MatchStatus | "all")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="scheduled">Agendadas</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
              <SelectItem value="finished">Finalizadas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-navy">
          Data
          <Input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
        </label>
      </div>
      {loading ? (
        <LoadingState label="Carregando partidas..." />
      ) : error ? (
        <ErrorState
          title="Não foi possível carregar as partidas."
          onRetry={() => void loadMatches()}
        />
      ) : visibleMatches.length === 0 ? (
        <EmptyState title="Nenhuma partida encontrada." />
      ) : (
        <div className="grid gap-3">
          {visibleMatches.map((match) => (
            <MatchCard key={match.id} match={match} admin={isAdmin} onOpen={() => openMatch(match)} />
          ))}
        </div>
      )}
      <Dialog open={Boolean(openedMatch)} onOpenChange={(open) => { if (!open) setOpenedMatch(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da partida</DialogTitle>
            <DialogDescription>{openedMatch?.roundLabel} · {openedMatch?.teamALabel} x {openedMatch?.teamBLabel}</DialogDescription>
          </DialogHeader>
          {openedMatch ? <div className="grid gap-4 text-sm"><p><strong>Data e horário:</strong> {openedMatch.scheduled_at ? new Date(openedMatch.scheduled_at).toLocaleString("pt-BR") : "Não informado"}</p><p><strong>Status:</strong> {openedMatch.status}</p>{isAdmin && openedMatch.status !== "cancelled" ? <><form onSubmit={saveOpenedScore} className="grid gap-2"><strong>Editar placar</strong><div className="grid grid-cols-2 gap-2"><label>Equipe A<Input type="number" min="0" step="1" value={openedScoreA} onChange={(event) => setOpenedScoreA(event.target.value)} /></label><label>Equipe B<Input type="number" min="0" step="1" value={openedScoreB} onChange={(event) => setOpenedScoreB(event.target.value)} /></label></div><Button type="submit" disabled={saving}>Salvar placar</Button></form><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void changeOpenedStatus("start_match")} disabled={saving || openedMatch.status !== "scheduled"}><Flag /> Em andamento</Button><Button type="button" onClick={() => void changeOpenedStatus("finish_match")} disabled={saving || openedMatch.status !== "in_progress"}><Flag /> Finalizar partida</Button></div><form onSubmit={saveOpenedGoal} className="grid gap-2 border-t pt-3"><strong>Adicionar gol</strong><Select value={openedGoalTeam} onValueChange={(value) => { setOpenedGoalTeam(value); setOpenedGoalPlayer(""); }}><SelectTrigger><SelectValue placeholder="Equipe que marcou" /></SelectTrigger><SelectContent><SelectItem value={openedMatch.team_a_id}>{openedMatch.teamALabel}</SelectItem><SelectItem value={openedMatch.team_b_id}>{openedMatch.teamBLabel}</SelectItem></SelectContent></Select><Select value={openedGoalPlayer} onValueChange={setOpenedGoalPlayer}><SelectTrigger><SelectValue placeholder="Jogador que marcou" /></SelectTrigger><SelectContent>{openedPlayers.filter((player) => player.team_id === openedGoalTeam).map((player) => <SelectItem key={player.player_id} value={player.player_id}>{player.player_name_snapshot}</SelectItem>)}</SelectContent></Select><Input type="number" min="0" step="1" placeholder="Minuto (opcional)" value={openedGoalMinute} onChange={(event) => setOpenedGoalMinute(event.target.value)} /><Button type="submit" disabled={saving}>Registrar gol</Button></form><div className="grid gap-1 border-t pt-3"><strong>Gols registrados</strong>{openedGoals.length ? openedGoals.map((goal) => <p key={goal.id}>{goal.minute !== null ? `${goal.minute}' ` : ""}{openedPlayers.find((player) => player.player_id === goal.player_id)?.player_name_snapshot ?? "Jogador"} · {goal.team_id === openedMatch.team_a_id ? openedMatch.teamALabel : openedMatch.teamBLabel}</p>) : <span className="text-muted-foreground">Nenhum gol registrado.</span>}</div></> : <p><strong>Placar:</strong> {openedMatch.score_a} x {openedMatch.score_b}</p>}</div> : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function formatRound(round?: Round) {
  return round
    ? new Date(`${round.scheduled_date}T12:00:00`).toLocaleDateString("pt-BR")
    : "Rodada";
}
function teamLabel(team?: MatchTeam) {
  return team ? `Time ${team.team_number}` : "Equipe";
}
