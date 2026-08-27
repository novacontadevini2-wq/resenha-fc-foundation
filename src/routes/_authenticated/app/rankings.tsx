import { createFileRoute } from "@tanstack/react-router";
import { Goal, Shield, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateAssists,
  calculateGoalkeeperRanking,
  calculateScorers,
} from "@/lib/rankings-service";
import type {
  Match,
  MatchAssist,
  MatchGoal,
  MatchGoalkeeperStat,
  Player,
  Round,
  Season,
  Tournament,
} from "@/types";

export const Route = createFileRoute("/_authenticated/app/rankings")({
  head: () => ({ meta: [{ title: "Rankings | Resenha FC" }] }),
  component: RankingsPage,
});

type Membership = { player_id: string; round_id: string; participation_status: string };
function RankingsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [goals, setGoals] = useState<MatchGoal[]>([]);
  const [assists, setAssists] = useState<MatchAssist[]>([]);
  const [keepers, setKeepers] = useState<MatchGoalkeeperStat[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [seasonId, setSeasonId] = useState("all");
  const [tournamentId, setTournamentId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    async function load() {
      const [
        { data: playerData },
        { data: matchData, error: matchError },
        { data: goalData },
        { data: assistData },
        { data: keeperData },
        { data: roundData },
        { data: seasonData },
        { data: tournamentData },
        { data: membershipData },
      ] = await Promise.all([
        supabase.from("players").select("*"),
        supabase.from("matches").select("*").eq("status", "finished"),
        supabase.from("match_goals").select("*"),
        supabase.from("match_assists").select("*"),
        supabase.from("goalkeeper_stats").select("*"),
        supabase.from("rounds").select("*"),
        supabase.from("seasons").select("*"),
        supabase.from("tournaments").select("*"),
        supabase.from("round_players").select("player_id, round_id, participation_status"),
      ]);
      if (matchError) setError(true);
      else {
        setPlayers((playerData ?? []) as Player[]);
        setMatches((matchData ?? []) as Match[]);
        setGoals((goalData ?? []) as MatchGoal[]);
        setAssists((assistData ?? []) as MatchAssist[]);
        setKeepers((keeperData ?? []) as MatchGoalkeeperStat[]);
        setRounds((roundData ?? []) as Round[]);
        setSeasons((seasonData ?? []) as Season[]);
        setTournaments((tournamentData ?? []) as Tournament[]);
        setMemberships((membershipData ?? []) as Membership[]);
      }
      setLoading(false);
    }
    void load();
  }, []);
  const filteredMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          (!tournamentId || tournamentId === "all" || match.tournament_id === tournamentId) &&
          (!seasonId ||
            seasonId === "all" ||
            rounds.some((round) => round.id === match.round_id && round.season_id === seasonId)),
      ),
    [matches, rounds, seasonId, tournamentId],
  );
  const ids = new Set(filteredMatches.map((match) => match.id));
  const filteredGoals = goals.filter((goal) => ids.has(goal.match_id));
  const filteredAssists = assists.filter((assist) => ids.has(assist.match_id));
  const filteredKeepers = keepers.filter((keeper) => ids.has(keeper.match_id));
  const scorerRows = calculateScorers(filteredGoals, players);
  const assistRows = calculateAssists(filteredAssists, players);
  const keeperRows = calculateGoalkeeperRanking(filteredKeepers, players, 1);
  const eligibleRoundIds = new Set(
    rounds
      .filter((round) => !seasonId || seasonId === "all" || round.season_id === seasonId)
      .map((round) => round.id),
  );
  const attendance = players
    .map((player) => {
      const rows = memberships.filter(
        (item) => item.player_id === player.id && eligibleRoundIds.has(item.round_id),
      );
      const confirmed = rows.filter((item) => item.participation_status === "confirmed").length;
      return {
        player,
        confirmed,
        eligible: rows.length,
        percentage: rows.length ? Math.round((confirmed / rows.length) * 100) : null,
      };
    })
    .filter((row) => row.confirmed > 0)
    .sort((a, b) => b.confirmed - a.confirmed);
  if (loading)
    return (
      <AppLayout title="Rankings">
        <LoadingState label="Carregando rankings..." />
      </AppLayout>
    );
  if (error)
    return (
      <AppLayout title="Rankings">
        <ErrorState title="Não foi possível carregar os rankings." />
      </AppLayout>
    );
  return (
    <AppLayout title="Rankings" subtitle="Desempenho real do Resenha FC.">
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-navy">
          Temporada
          <Select
            value={seasonId}
            onValueChange={(value) => {
              setSeasonId(value);
              setTournamentId("all");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as temporadas</SelectItem>
              {seasons.map((season) => (
                <SelectItem key={season.id} value={season.id}>
                  {season.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-navy">
          Torneio
          <Select value={tournamentId} onValueChange={setTournamentId}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os torneios</SelectItem>
              {tournaments
                .filter((tournament) => seasonId === "all" || tournament.season_id === seasonId)
                .map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <RankingSection
          title="Artilharia"
          icon={Goal}
          rows={scorerRows.map((row) => ({ name: row.playerName, value: `${row.total} gols`, total: row.total }))}
          empty="Nenhum gol registrado."
        />
        <RankingSection
          title="Garçons"
          icon={Trophy}
          rows={assistRows.map((row) => ({
            name: row.playerName,
            value: `${row.total} assistências`,
            total: row.total,
          }))}
          empty="Nenhuma assistência registrada."
        />
        <RankingSection
          title="Paredões"
          icon={Shield}
          rows={keeperRows.map((row) => ({
            name: row.playerName,
            value: `${row.matches} jogos · ${row.cleanSheets} clean sheets · índice ${row.performanceIndex}`,
            total: row.performanceIndex,
          }))}
          empty="Dados insuficientes para definir o Paredão."
        />
        <RankingSection
          title="Presença"
          icon={Users}
          rows={attendance.map((row) => ({
            name: row.player.name,
            value: `${row.confirmed} partidas${row.percentage != null ? ` · ${row.percentage}%` : ""}`,
            total: row.confirmed,
          }))}
          empty="Nenhuma participação registrada."
        />
      </div>
    </AppLayout>
  );
}
function RankingSection({
  title,
  icon: Icon,
  rows,
  empty,
}: {
  title: string;
  icon: typeof Goal;
  rows: { name: string; value: string; total: number }[];
  empty: string;
}) {
  return (
    <SectionCard title={title} icon={Icon}>
      {rows.length ? (
        <div className="grid gap-2">
          {rows.map((row, index) => {
            const rank =
              index === 0 || row.total !== rows[index - 1].total
                ? index + 1
                : rows.findIndex((item) => item.total === row.total) + 1;
            return (
              <div
                key={`${row.name}-${index}`}
                className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm"
              >
                <strong>
                  {rank}º {row.name}
                </strong>
                <span className="text-meta">{row.value}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title={empty} />
      )}
    </SectionCard>
  );
}
