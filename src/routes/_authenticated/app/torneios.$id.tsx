import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Crown, Shield, Target, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { MatchCard, type MatchCardData } from "@/components/matches/MatchCard";
import { MatchStatusBadge } from "@/components/matches/MatchStatusBadge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type TournamentTeam = { tournament_id: string; team_id: string };
type RoundLabel = { id: string; scheduled_date: string };

export const Route = createFileRoute("/_authenticated/app/torneios/$id")({
  head: () => ({ meta: [{ title: "Detalhe do torneio | Resenha FC" }] }),
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
  const [availableTeams, setAvailableTeams] = useState<MatchTeam[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
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
    const { data: matchData } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", id)
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    const matchIds = ((matchData ?? []) as Match[]).map((match) => match.id);
    const [
      { data: seasonData },
      { data: teamsData },
      { data: tournamentTeams },
      { data: goalData },
      { data: assistData },
      { data: keeperData },
      { data: playersData },
      { data: roundsData },
    ] = await Promise.all([
      supabase.from("seasons").select("*").eq("id", current.season_id).maybeSingle(),
      supabase.from("draw_teams").select("id, draw_id, team_number, total_rating"),
      supabase.from("tournament_teams").select("tournament_id, team_id").eq("tournament_id", id),
      matchIds.length
        ? supabase.from("match_goals").select("*").in("match_id", matchIds)
        : Promise.resolve({ data: [] }),
      matchIds.length
        ? supabase.from("match_assists").select("*").in("match_id", matchIds)
        : Promise.resolve({ data: [] }),
      matchIds.length
        ? supabase.from("goalkeeper_stats").select("*").in("match_id", matchIds)
        : Promise.resolve({ data: [] }),
      supabase.from("players").select("id, name, photo_url"),
      supabase.from("rounds").select("id, scheduled_date"),
    ]);
    const teamMap = new Map(((teamsData ?? []) as MatchTeam[]).map((team) => [team.id, team]));
    const roundMap = new Map(
      ((roundsData ?? []) as RoundLabel[]).map((round) => [round.id, round]),
    );
    const playerList = (playersData ?? []) as Player[];
    const nextMatches = ((matchData ?? []) as Match[]).map((match) => ({
      ...match,
      roundLabel: formatDate(roundMap.get(match.round_id)?.scheduled_date),
      teamALabel: teamLabel(teamMap.get(match.team_a_id)),
      teamBLabel: teamLabel(teamMap.get(match.team_b_id)),
    }));
    const officialMatches = ((matchData ?? []) as Match[]).filter(
      (match) => match.status === "finished",
    );
    const officialMatchIds = new Set(officialMatches.map((match) => match.id));
    const tournamentTeamList = ((tournamentTeams ?? []) as TournamentTeam[])
      .map((item) => teamMap.get(item.team_id))
      .filter((team): team is MatchTeam => Boolean(team));
    const tournamentTeamIds = new Set(tournamentTeamList.map((team) => team.id));
    setTournament(current);
    setSeason((seasonData ?? null) as Season | null);
    setMatches(nextMatches);
    setStandings(
      calculateStandings(officialMatches, tournamentTeamList, {
        win: current.points_win,
        draw: current.points_draw,
        loss: current.points_loss,
      }),
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
    setAvailableTeams(((teamsData ?? []) as MatchTeam[]).filter((team) => !tournamentTeamIds.has(team.id)));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [id]);
  async function changeStatus(status: Tournament["status"]) {
    if (!tournament || !window.confirm(`Alterar status do torneio para ${status}?`)) return;
    const { error: updateError } = await supabase.rpc("set_tournament_status", {
      p_tournament_id: tournament.id,
      p_status: status,
    });
    if (updateError) toast.error("Não foi possível atualizar o torneio.");
    else {
      toast.success("Torneio atualizado.");
      await load();
    }
  }
  async function addTeam() {
    if (!selectedTeamId) return;
    const { error: addError } = await supabase.rpc("add_tournament_team", { p_tournament_id: id, p_team_id: selectedTeamId });
    if (addError) toast.error("Não foi possível adicionar a equipe ao torneio.");
    else { toast.success("Equipe adicionada ao torneio."); setSelectedTeamId(""); await load(); }
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
        <ErrorState title="Não foi possível carregar o torneio." />
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
              {matches.length} partidas · {totalGoals} gols
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
          name={scorer?.playerName}
          detail={scorer ? `${scorer.total} gols` : "Nenhum gol registrado."}
        />
        <Highlight
          icon={Target}
          title="Garçom"
          name={assister?.playerName}
          detail={assister ? `${assister.total} assistências` : "Nenhuma assistência registrada."}
        />
        <Highlight
          icon={Shield}
          title="Paredão"
          name={goalkeeper?.playerName}
          detail={
            goalkeeper
              ? `${goalkeeper.cleanSheets} clean sheets · índice ${goalkeeper.performanceIndex}`
              : "Dados insuficientes para definir o Paredão."
          }
        />
      </div>
      {isAdmin ? <SectionCard title="Equipes do torneio" icon={Trophy} className="mt-5"><div className="flex flex-wrap gap-2"><Select value={selectedTeamId} onValueChange={setSelectedTeamId}><SelectTrigger className="w-56"><SelectValue placeholder="Adicionar equipe" /></SelectTrigger><SelectContent>{availableTeams.map((team) => <SelectItem key={team.id} value={team.id}>{teamLabel(team)}</SelectItem>)}</SelectContent></Select><Button onClick={() => void addTeam()} disabled={!selectedTeamId}>Adicionar equipe</Button></div></SectionCard> : null}
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
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <EmptyState title="Nenhuma partida vinculada ao torneio." />
          )}
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
function teamLabel(team?: MatchTeam) {
  return team ? `Time ${team.team_number}` : "Equipe";
}
