import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  Flame,
  Goal,
  Handshake,
  Medal,
  Shield,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
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
  buildAchievements,
  buildCareer,
  playerLabel,
  rankOf,
  type PlayerCareer,
  type TeamPlayerRow,
} from "@/lib/player-stats";
import type {
  Match,
  MatchAssist,
  MatchGoal,
  MatchGoalkeeperStat,
  Player,
  Round,
} from "@/types";

interface RoundPlayerRow {
  round_id: string;
  player_id: string;
  participation_status: string;
}

function MeuPerfilPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<(TeamPlayerRow & { draw_id: string })[]>([]);
  const [goals, setGoals] = useState<MatchGoal[]>([]);
  const [assists, setAssists] = useState<MatchAssist[]>([]);
  const [keeperStats, setKeeperStats] = useState<MatchGoalkeeperStat[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundPlayers, setRoundPlayers] = useState<RoundPlayerRow[]>([]);
  const [claimId, setClaimId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [
      playersRes,
      matchesRes,
      teamPlayersRes,
      goalsRes,
      assistsRes,
      keeperRes,
      roundsRes,
      roundPlayersRes,
    ] = await Promise.all([
      supabase.from("players").select("*").order("name"),
      supabase.from("matches").select("*"),
      supabase.from("draw_team_players").select("draw_id, team_id, player_id"),
      supabase.from("match_goals").select("*"),
      supabase.from("match_assists").select("*"),
      supabase.from("goalkeeper_stats").select("*"),
      supabase.from("rounds").select("*").order("scheduled_date", { ascending: true }),
      supabase.from("round_players").select("round_id, player_id, participation_status"),
    ]);

    const firstError = [
      playersRes.error,
      matchesRes.error,
      teamPlayersRes.error,
      goalsRes.error,
      assistsRes.error,
      keeperRes.error,
      roundsRes.error,
      roundPlayersRes.error,
    ].find(Boolean);

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setPlayers((playersRes.data ?? []) as Player[]);
    setMatches((matchesRes.data ?? []) as Match[]);
    setTeamPlayers((teamPlayersRes.data ?? []) as (TeamPlayerRow & { draw_id: string })[]);
    setGoals((goalsRes.data ?? []) as MatchGoal[]);
    setAssists((assistsRes.data ?? []) as MatchAssist[]);
    setKeeperStats((keeperRes.data ?? []) as MatchGoalkeeperStat[]);
    setRounds((roundsRes.data ?? []) as Round[]);
    setRoundPlayers((roundPlayersRes.data ?? []) as RoundPlayerRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const me = useMemo(
    () => players.find((player) => player.user_id && player.user_id === user?.id) ?? null,
    [players, user?.id],
  );

  const career: PlayerCareer | null = useMemo(
    () => (me ? buildCareer(me.id, matches, teamPlayers, goals, assists) : null),
    [me, matches, teamPlayers, goals, assists],
  );

  const achievements = useMemo(() => {
    if (!me || !career) return [];
    const perMatch = new Map<string, number>();
    goals
      .filter((goal) => goal.player_id === me.id)
      .forEach((goal) => perMatch.set(goal.match_id, (perMatch.get(goal.match_id) ?? 0) + 1));
    const hatTricks = [...perMatch.values()].filter((count) => count >= 3).length;
    const cleanSheets = keeperStats.filter(
      (stat) => stat.player_id === me.id && stat.goals_conceded === 0,
    ).length;
    return buildAchievements(career, hatTricks, cleanSheets);
  }, [me, career, goals, keeperStats]);

  const goalRank = useMemo(() => {
    if (!me) return null;
    return rankOf(
      me.id,
      players.map((player) => ({
        playerId: player.id,
        value: goals.filter((goal) => goal.player_id === player.id).length,
      })),
    );
  }, [me, players, goals]);

  const assistRank = useMemo(() => {
    if (!me) return null;
    return rankOf(
      me.id,
      players.map((player) => ({
        playerId: player.id,
        value: assists.filter((assist) => assist.player_id === player.id).length,
      })),
    );
  }, [me, players, assists]);

  const nextRound = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (
      rounds.find((round) => round.status !== "cancelled" && round.scheduled_date >= today) ?? null
    );
  }, [rounds]);

  const myPresence = useMemo(
    () =>
      nextRound && me
        ? (roundPlayers.find(
            (row) => row.round_id === nextRound.id && row.player_id === me.id,
          )?.participation_status ?? null)
        : null,
    [nextRound, me, roundPlayers],
  );

  const confirmedCount = useMemo(
    () =>
      nextRound
        ? roundPlayers.filter(
            (row) => row.round_id === nextRound.id && row.participation_status === "confirmed",
          ).length
        : 0,
    [nextRound, roundPlayers],
  );

  const myMatches = useMemo(() => {
    if (!me) return [];
    const myTeams = new Set(
      teamPlayers.filter((row) => row.player_id === me.id).map((row) => row.team_id),
    );
    return matches
      .filter(
        (match) =>
          match.status === "finished" &&
          (myTeams.has(match.team_a_id) || myTeams.has(match.team_b_id)),
      )
      .sort((a, b) =>
        (b.finished_at ?? b.scheduled_at ?? "").localeCompare(a.finished_at ?? a.scheduled_at ?? ""),
      )
      .slice(0, 6)
      .map((match) => {
        const home = myTeams.has(match.team_a_id);
        const mine = home ? match.score_a : match.score_b;
        const other = home ? match.score_b : match.score_a;
        return {
          id: match.id,
          date: match.finished_at ?? match.scheduled_at,
          mine,
          other,
          result: mine > other ? "Vitória" : mine === other ? "Empate" : "Derrota",
          myGoals: goals.filter((goal) => goal.match_id === match.id && goal.player_id === me.id)
            .length,
          myAssists: assists.filter(
            (assist) => assist.match_id === match.id && assist.player_id === me.id,
          ).length,
        };
      });
  }, [me, matches, teamPlayers, goals, assists]);

  const unclaimed = useMemo(() => players.filter((player) => !player.user_id), [players]);

  async function claim() {
    if (!claimId) return;
    setSaving(true);
    const { error: claimError } = await supabase.rpc("claim_player_profile", {
      p_player_id: claimId,
    });
    setSaving(false);
    if (claimError) {
      toast.error(claimError.message);
      return;
    }
    toast.success("Perfil vinculado! Bem-vindo ao Resenha.");
    await load();
  }

  async function setPresence(status: "confirmed" | "declined") {
    if (!nextRound) return;
    setSaving(true);
    const { error: presenceError } = await supabase.rpc("set_my_round_participation", {
      p_round_id: nextRound.id,
      p_status: status,
    });
    setSaving(false);
    if (presenceError) {
      toast.error(presenceError.message);
      return;
    }
    toast.success(status === "confirmed" ? "Presença confirmada!" : "Ausência registrada.");
    await load();
  }

  if (loading) {
    return (
      <AppLayout title="Meu jogo">
        <LoadingState />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Meu jogo">
        <ErrorState message={error} onRetry={() => void load()} />
      </AppLayout>
    );
  }

  if (!me) {
    return (
      <AppLayout title="Meu jogo">
        <SectionCard title="Quem é você na pelada?" icon={Sparkles}>
          <p className="text-meta mb-3">
            Escolha o seu nome no elenco para liberar seus números, medalhas e a confirmação de
            presença.
          </p>
          {unclaimed.length ? (
            <div className="grid gap-3 sm:max-w-md">
              <Select value={claimId} onValueChange={setClaimId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu nome" />
                </SelectTrigger>
                <SelectContent>
                  {unclaimed.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {playerLabel(player)}
                      {player.shirt_number ? ` · #${player.shirt_number}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button disabled={saving || !claimId} onClick={() => void claim()}>
                Este sou eu
              </Button>
            </div>
          ) : (
            <EmptyState message="Nenhum jogador disponível para vincular. Peça ao administrador para cadastrar você no elenco." />
          )}
        </SectionCard>
      </AppLayout>
    );
  }

  const stats = career!;

  return (
    <AppLayout title="Meu jogo">
      <section className="card-surface mb-5 overflow-hidden p-0">
        <div className="surface-navy flex items-center gap-4 p-5">
          <div className="size-20 shrink-0 overflow-hidden rounded-2xl bg-white/10">
            {me.photo_url ? (
              <img src={me.photo_url} alt={me.name} className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center font-display text-2xl font-bold text-navy-foreground">
                {playerLabel(me).slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange">
              Nível {stats.level} · {stats.xp} XP
            </p>
            <h2 className="font-display text-2xl font-bold text-navy-foreground">
              {playerLabel(me)}
            </h2>
            <p className="text-sm text-navy-foreground/70">
              {me.shirt_number ? `Camisa ${me.shirt_number} · ` : ""}Nota {me.overall_rating}
            </p>
            <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-orange" style={{ width: `${stats.levelProgress}%` }} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border text-center">
          <Stat label="Jogos" value={stats.matches} />
          <Stat label="Gols" value={stats.goals} />
          <Stat label="Assistências" value={stats.assists} />
          <Stat label="Vitórias" value={stats.wins} />
          <Stat label="Aproveitamento" value={`${stats.winRate}%`} />
          <Stat label="Gols/jogo" value={stats.goalsPerMatch} />
        </div>
        {stats.form.length ? (
          <div className="flex items-center gap-2 border-t border-border p-4">
            <Flame className="size-4 text-orange" />
            <span className="text-meta">Últimos jogos:</span>
            {stats.form.map((result, index) => (
              <span
                key={`${result}-${index}`}
                className={`flex size-6 items-center justify-center rounded-md text-xs font-bold text-white ${
                  result === "V" ? "bg-emerald-600" : result === "E" ? "bg-slate-400" : "bg-red-500"
                }`}
              >
                {result}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <SectionCard title="Próxima rodada" icon={CalendarCheck} className="mb-5">
        {nextRound ? (
          <div className="grid gap-3">
            <div>
              <p className="font-semibold text-navy">
                {new Date(`${nextRound.scheduled_date}T12:00:00`).toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
              </p>
              <p className="text-meta">
                {nextRound.start_time?.slice(0, 5) ?? "Horário a confirmar"} ·{" "}
                {nextRound.location_name ?? "Local a confirmar"} · {confirmedCount} confirmados
              </p>
            </div>
            <p className="text-sm text-navy">
              {myPresence === "confirmed"
                ? "Você está confirmado. Bola rolando!"
                : myPresence === "declined"
                  ? "Você marcou ausência nesta rodada."
                  : "Ainda não sabemos se você vai jogar."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={saving} onClick={() => void setPresence("confirmed")}>
                Vou jogar
              </Button>
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => void setPresence("declined")}
              >
                Não vou
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState message="Nenhuma rodada marcada por enquanto." />
        )}
      </SectionCard>

      <div className="mb-5 grid gap-5 sm:grid-cols-2">
        <SectionCard title="Seu lugar nos rankings" icon={Trophy}>
          <div className="grid gap-3 text-sm text-navy">
            <p className="flex items-center gap-2">
              <Goal className="size-4 text-orange" />
              {goalRank
                ? `${goalRank.position}º na artilharia entre ${goalRank.total} goleadores`
                : "Ainda sem gols para entrar na artilharia"}
            </p>
            <p className="flex items-center gap-2">
              <Handshake className="size-4 text-orange" />
              {assistRank
                ? `${assistRank.position}º entre os garçons (${assistRank.total} no páreo)`
                : "Ainda sem assistências registradas"}
            </p>
            <p className="flex items-center gap-2">
              <Shield className="size-4 text-orange" />
              {stats.participations} participações diretas em gols
            </p>
            <Link to="/app/rankings" className="font-semibold text-orange">
              Ver rankings completos
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Últimas partidas" icon={Swords}>
          {myMatches.length ? (
            <div className="grid gap-2">
              {myMatches.map((match) => (
                <Link
                  key={match.id}
                  to="/app/partidas/$id"
                  params={{ id: match.id }}
                  className="flex items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0"
                >
                  <span className="text-navy">
                    <strong>
                      {match.mine} x {match.other}
                    </strong>{" "}
                    · {match.result}
                  </span>
                  <span className="text-meta">
                    {match.myGoals} gol(s) · {match.myAssists} assist.
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState message="Você ainda não tem partidas finalizadas." />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Suas medalhas" icon={Medal}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`rounded-xl border p-3 ${
                achievement.unlocked ? "border-orange/40 bg-orange/10" : "border-border bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <Medal
                  className={`size-4 ${achievement.unlocked ? "text-orange" : "text-muted-foreground"}`}
                />
                <p className="font-semibold text-navy">{achievement.title}</p>
              </div>
              <p className="text-meta mt-1">{achievement.description}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy/10">
                <div
                  className="h-full rounded-full bg-orange"
                  style={{ width: `${(achievement.progress / achievement.goal) * 100}%` }}
                />
              </div>
              <p className="text-meta mt-1">
                {achievement.progress}/{achievement.goal}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-b border-border p-3">
      <p className="font-display text-xl font-bold text-navy">{value}</p>
      <p className="text-meta text-[11px] uppercase tracking-wide">{label}</p>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/app/meu-perfil")({
  head: () => ({
    meta: [
      { title: "Meu jogo · Resenha FC" },
      {
        name: "description",
        content:
          "Seus gols, assistências, medalhas, aproveitamento e confirmação de presença no Resenha Futebol Clube.",
      },
      { property: "og:title", content: "Meu jogo · Resenha FC" },
      {
        property: "og:description",
        content: "Acompanhe sua evolução na pelada do Resenha FC: números, medalhas e presença.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MeuPerfilPage,
});
