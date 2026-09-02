import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Crown, Link2, Shield, Target, Trophy, Unlink, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { MatchCard, type MatchCardData } from "@/components/matches/MatchCard";
import { MatchStatusBadge } from "@/components/matches/MatchStatusBadge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateAssists,
  calculateGoalkeeperRanking,
  calculateScorers,
} from "@/lib/rankings-service";
import { calculateStandings } from "@/lib/standings-service";
import type {
  Match,
  MatchAssist,
  MatchGoal,
  MatchGoalkeeperStat,
  MatchTeam,
  Player,
  Season,
  Tournament,
} from "@/types";

type TournamentTeam = { id: string; tournament_id: string; team_id: string };
type RoundLabel = { id: string; scheduled_date: string; season_id: string | null };
type DrawLabel = { id: string; round_id: string };
type LabeledTeam = MatchTeam & { label: string };

export const Route = createFileRoute("/_authenticated/app/torneios/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe do torneio | Resenha FC" },
      {
        name: "description",
        content: "Classificação, destaques e partidas do torneio do Resenha FC.",
      },
      { property: "og:title", content: "Detalhe do torneio | Resenha FC" },
      {
        property: "og:description",
        content: "Classificação, destaques e partidas do torneio do Resenha FC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TournamentDetailsPage,
});

function TournamentDetailsPage() {
  const { id } = Route.useParams();
  const { isAdmin } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [matches, setMatches] = useState<MatchCardData[]>([]);
  const [standings, setStandings] = useState<ReturnType<typeof calculateStandings>>([]);
  const [scorers, setScorers] = useState<ReturnType<typeof calculateScorers>>([]);
  const [assists, setAssists] = useState<ReturnType<typeof calculateAssists>>([]);
  const [goalkeepers, setGoalkeepers] = useState<ReturnType<typeof calculateGoalkeeperRanking>>([]);
  const [tournamentTeams, setTournamentTeams] = useState<
    { membershipId: string; team: LabeledTeam }[]
  >([]);
  const [availableTeams, setAvailableTeams] = useState<LabeledTeam[]>([]);
  const [availableMatches, setAvailableMatches] = useState<MatchCardData[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (tournamentError || !tournamentData) {
      setError(true);
      setLoading(false);
      return;
    }
    const current = tournamentData as Tournament;
    const [
      { data: seasonData },
      { data: allMatchData },
      { data: teamsData },
      { data: tournamentTeamsData },
      { data: playersData },
      { data: roundsData },
      { data: drawsData },
    ] = await Promise.all([
      supabase.from("seasons").select("*").eq("id", current.season_id).maybeSingle(),
      supabase
        .from("matches")
        .select("*")
        .order("scheduled_at", { ascending: true, nullsFirst: false }),
      supabase.from("draw_teams").select("id, draw_id, team_number, total_rating"),
      supabase.from("tournament_teams").select("id, tournament_id, team_id").eq("tournament_id", id),
      supabase.from("players").select("id, name, photo_url"),
      supabase.from("rounds").select("id, scheduled_date, season_id"),
      supabase.from("draws").select("id, round_id"),
    ]);

    const roundMap = new Map(((roundsData ?? []) as RoundLabel[]).map((r) => [r.id, r]));
    const drawMap = new Map(((drawsData ?? []) as DrawLabel[]).map((d) => [d.id, d]));
    const label = (team?: MatchTeam) => {
      if (!team) return "Equipe";
      const round = roundMap.get(drawMap.get(team.draw_id)?.round_id ?? "");
      return `Time ${team.team_number}${round ? ` · ${formatDate(round.scheduled_date)}` : ""}`;
    };
    const labeledTeams = ((teamsData ?? []) as MatchTeam[]).map((team) => ({
      ...team,
      label: label(team),
    }));
    const teamMap = new Map(labeledTeams.map((team) => [team.id, team]));
    const teamSeason = (teamId: string) =>
      roundMap.get(drawMap.get(teamMap.get(teamId)?.draw_id ?? "")?.round_id ?? "")?.season_id ??
      null;

    const allMatches = (allMatchData ?? []) as Match[];
    const decorate = (match: Match): MatchCardData => ({
      ...match,
      roundLabel: formatDate(roundMap.get(match.round_id)?.scheduled_date),
      teamALabel: teamMap.get(match.team_a_id)?.label ?? "Equipe",
      teamBLabel: teamMap.get(match.team_b_id)?.label ?? "Equipe",
    });
    const tournamentMatches = allMatches.filter((match) => match.tournament_id === id);
    const matchIds = tournamentMatches.map((match) => match.id);
    const [{ data: goalData }, { data: assistData }, { data: keeperData }] = await Promise.all([
      matchIds.length
        ? supabase.from("match_goals").select("*").in("match_id", matchIds)
        : Promise.resolve({ data: [] }),
      matchIds.length
        ? supabase.from("match_assists").select("*").in("match_id", matchIds)
        : Promise.resolve({ data: [] }),
      matchIds.length
        ? supabase.from("goalkeeper_stats").select("*").in("match_id", matchIds)
        : Promise.resolve({ data: [] }),
    ]);

    const playerList = (playersData ?? []) as Player[];
    const officialMatches = tournamentMatches.filter((match) => match.status === "finished");
    const officialMatchIds = new Set(officialMatches.map((match) => match.id));
    const memberships = ((tournamentTeamsData ?? []) as TournamentTeam[])
      .map((item) => {
        const team = teamMap.get(item.team_id);
        return team ? { membershipId: item.id, team } : null;
      })
      .filter((item): item is { membershipId: string; team: LabeledTeam } => Boolean(item));
    const memberTeamIds = new Set(memberships.map((item) => item.team.id));

    setTournament(current);
    setSeason((seasonData ?? null) as Season | null);
    setMatches(tournamentMatches.map(decorate));
    setTournamentTeams(memberships);
    setStandings(
      calculateStandings(
        officialMatches,
        memberships.map((item) => item.team),
        { win: current.points_win, draw: current.points_draw, loss: current.points_loss },
      ),
    );
    setScorers(
      calculateScorers(
        ((goalData ?? []) as MatchGoal[]).filter((goal) => officialMatchIds.has(goal.match_id)),
        playerList,
      ),
    );
    setAssists(
      calculateAssists(
        ((assistData ?? []) as MatchAssist[]).filter((assist) =>
          officialMatchIds.has(assist.match_id),
        ),
        playerList,
      ),
    );
    setGoalkeepers(
      calculateGoalkeeperRanking(
        ((keeperData ?? []) as MatchGoalkeeperStat[]).filter((stat) =>
          officialMatchIds.has(stat.match_id),
        ),
        playerList,
        1,
      ),
    );
    setAvailableTeams(
      labeledTeams.filter(
        (team) => !memberTeamIds.has(team.id) && teamSeason(team.id) === current.season_id,
      ),
    );
    setAvailableMatches(
      allMatches
        .filter(
          (match) =>
            !match.tournament_id &&
            roundMap.get(match.round_id)?.season_id === current.season_id &&
            (memberTeamIds.has(match.team_a_id) || memberTeamIds.has(match.team_b_id)),
        )
        .map(decorate),
    );
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(status: Tournament["status"]) {
    if (!tournament || !window.confirm(`Alterar status do torneio para ${status}?`)) return;
    const { error: updateError } = await supabase.rpc("set_tournament_status", {
      p_tournament_id: tournament.id,
      p_status: status,
    });
    if (updateError) toast.error(updateError.message);
    else {
      toast.success("Torneio atualizado.");
      await load();
    }
  }

  async function addTeam() {
    if (!selectedTeamId) return;
    const { error: addError } = await supabase.rpc("add_tournament_team", {
      p_tournament_id: id,
      p_team_id: selectedTeamId,
    });
    if (addError) toast.error(addError.message);
    else {
      toast.success("Equipe adicionada ao torneio.");
      setSelectedTeamId("");
      await load();
    }
  }

  async function removeTeam(membershipId: string) {
    if (!window.confirm("Remover esta equipe do torneio?")) return;
    const { error: removeError } = await supabase
      .from("tournament_teams")
      .delete()
      .eq("id", membershipId);
    if (removeError) toast.error(removeError.message);
    else {
      toast.success("Equipe removida do torneio.");
      await load();
    }
  }

  async function attachMatch() {
    if (!selectedMatchId) return;
    const { error: attachError } = await supabase.rpc("attach_match_to_tournament", {
      p_match_id: selectedMatchId,
      p_tournament_id: id,
    });
    if (attachError) toast.error(attachError.message);
    else {
      toast.success("Partida vinculada ao torneio.");
      setSelectedMatchId("");
      await load();
    }
  }

  async function detachMatch(matchId: string) {
    if (!window.confirm("Desvincular esta partida do torneio?")) return;
    const { error: detachError } = await supabase.rpc("detach_match_from_tournament", {
      p_match_id: matchId,
    });
    if (detachError) toast.error(detachError.message);
    else {
      toast.success("Partida desvinculada.");
      await load();
    }
  }

  if (loading)
    return (
      <AppLayout title="Torneio">
        <LoadingState label="Carregando torneio..." />
      </AppLayout>
    );
  if (error || !tournament)
    return (
      <AppLayout title="Torneio">
        <ErrorState title="Não foi possível carregar o torneio." onRetry={() => void load()} />
      </AppLayout>
    );

  const scorer = scorers[0];
  const assister = assists[0];
  const goalkeeper = goalkeepers[0];
  const totalGoals = scorers.reduce((sum, row) => sum + row.total, 0);

  return (
    <AppLayout title={tournament.name} subtitle={season?.name ?? "Torneio Resenha FC"}>
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/app/torneios">
          <ArrowLeft /> Voltar para torneios
        </Link>
      </Button>
      <section className="card-surface mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-meta">
              {tournament.description ?? "Competição oficial do Resenha FC"}
            </p>
            <p className="text-meta mt-1">
              {matches.length} partidas · {totalGoals} gols · {tournamentTeams.length} equipes
            </p>
          </div>
          <MatchStatusBadge
            status={
              tournament.status === "active"
                ? "in_progress"
                : tournament.status === "finished"
                  ? "finished"
                  : tournament.status === "cancelled"
                    ? "cancelled"
                    : "scheduled"
            }
          />
        </div>
        {isAdmin ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {tournament.status === "planned" ? (
              <Button onClick={() => void changeStatus("active")}>Iniciar torneio</Button>
            ) : null}
            {tournament.status === "active" ? (
              <Button variant="outline" onClick={() => void changeStatus("finished")}>
                Finalizar torneio
              </Button>
            ) : null}
            {["planned", "active"].includes(tournament.status) ? (
              <Button variant="ghost" onClick={() => void changeStatus("cancelled")}>
                Cancelar torneio
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
      <div className="grid gap-3 sm:grid-cols-3">
        <Highlight
          icon={Crown}
          title="Artilheiro"
          {...(scorer?.playerName ? { name: scorer.playerName } : {})}
          detail={scorer ? `${scorer.total} gols` : "Nenhum gol registrado."}
        />
        <Highlight
          icon={Target}
          title="Garçom"
          {...(assister?.playerName ? { name: assister.playerName } : {})}
          detail={assister ? `${assister.total} assistências` : "Nenhuma assistência registrada."}
        />
        <Highlight
          icon={Shield}
          title="Paredão"
          {...(goalkeeper?.playerName ? { name: goalkeeper.playerName } : {})}
          detail={
            goalkeeper
              ? `${goalkeeper.cleanSheets} clean sheets · índice ${goalkeeper.performanceIndex}`
              : "Dados insuficientes para definir o Paredão."
          }
        />
      </div>
      <SectionCard title="Equipes do torneio" icon={Trophy} className="mt-5">
        {tournamentTeams.length ? (
          <div className="grid gap-2">
            {tournamentTeams.map((item) => (
              <div
                key={item.membershipId}
                className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm"
              >
                <strong className="text-navy">{item.team.label}</strong>
                <div className="flex items-center gap-3">
                  <span className="text-meta">força {item.team.total_rating}</span>
                  {isAdmin ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover equipe"
                      onClick={() => void removeTeam(item.membershipId)}
                    >
                      <X />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhuma equipe vinculada ao torneio." />
        )}
        {isAdmin ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Adicionar equipe da temporada" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => void addTeam()} disabled={!selectedTeamId}>
              Adicionar equipe
            </Button>
            {availableTeams.length === 0 ? (
              <p className="text-meta w-full">
                Nenhuma equipe disponível nesta temporada. Confirme um sorteio para gerar equipes.
              </p>
            ) : null}
          </div>
        ) : null}
      </SectionCard>
      <div className="mt-5 grid gap-5">
        <SectionCard title="Classificação" icon={Trophy}>
          {standings.length ? (
            <div className="grid gap-2">
              {standings.map((row, index) => (
                <div
                  key={row.teamId}
                  className="grid grid-cols-[2rem_1fr_repeat(4,auto)] items-center gap-2 border-b border-border py-2 text-sm"
                >
                  <strong>{index + 1}º</strong>
                  <strong>{row.teamName}</strong>
                  <span>{row.played}J</span>
                  <span>{row.wins}V</span>
                  <span>
                    {row.goalDifference > 0 ? "+" : ""}
                    {row.goalDifference}SG
                  </span>
                  <strong>{row.points} pts</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma partida finalizada para classificar." />
          )}
        </SectionCard>
        <SectionCard title="Artilharia e assistências" icon={Target}>
          <RankingList
            title="Artilharia"
            rows={scorers}
            unit="gols"
            empty="Nenhum gol registrado."
          />
          <RankingList
            title="Assistências"
            rows={assists}
            unit="assistências"
            empty="Nenhuma assistência registrada."
          />
        </SectionCard>
        <SectionCard title="Partidas" icon={Trophy}>
          {matches.length ? (
            <div className="grid gap-3">
              {matches.map((match) => (
                <div key={match.id} className="grid gap-2">
                  <MatchCard match={match} />
                  {isAdmin ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-self-end"
                      onClick={() => void detachMatch(match.id)}
                    >
                      <Unlink /> Desvincular
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma partida vinculada ao torneio." />
          )}
          {isAdmin ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Select value={selectedMatchId} onValueChange={setSelectedMatchId}>
                <SelectTrigger className="w-72">
                  <SelectValue placeholder="Vincular partida existente" />
                </SelectTrigger>
                <SelectContent>
                  {availableMatches.map((match) => (
                    <SelectItem key={match.id} value={match.id}>
                      {match.teamALabel} x {match.teamBLabel} · {match.roundLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => void attachMatch()} disabled={!selectedMatchId}>
                <Link2 /> Vincular partida
              </Button>
              {availableMatches.length === 0 ? (
                <p className="text-meta w-full">
                  Nenhuma partida disponível: as partidas precisam ser da mesma temporada e envolver
                  equipes já adicionadas ao torneio.
                </p>
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      </div>
    </AppLayout>
  );
}

function Highlight({
  icon: Icon,
  title,
  name,
  detail,
}: {
  icon: typeof Trophy;
  title: string;
  name?: string;
  detail: string;
}) {
  return (
    <article className="card-surface p-4">
      <Icon className="size-5 text-orange" />
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <h2 className="mt-1 font-display text-xl font-bold text-navy">
        {name ?? "Aguardando dados"}
      </h2>
      <p className="text-meta mt-1">{detail}</p>
    </article>
  );
}

function RankingList({
  title,
  rows,
  unit,
  empty,
}: {
  title: string;
  rows: { playerId: string; playerName: string; total: number }[];
  unit: string;
  empty: string;
}) {
  return (
    <div className="mt-3">
      <h3 className="font-display font-bold text-navy">{title}</h3>
      {rows.length ? (
        rows.slice(0, 5).map((row, index) => (
          <p key={row.playerId} className="text-meta mt-1">
            {index + 1}º {row.playerName} ·{" "}
            <strong className="text-navy">
              {row.total} {unit}
            </strong>
          </p>
        ))
      ) : (
        <p className="text-meta mt-1">{empty}</p>
      )}
    </div>
  );
}

function formatDate(date?: string) {
  return date ? new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR") : "Rodada";
}
