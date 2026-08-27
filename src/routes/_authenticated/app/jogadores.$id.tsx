import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Goal, Trophy, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { PlayerStatusBadge } from "@/components/players/PlayerStatusBadge";
import { PlayerCard } from "@/components/players/PlayerCard";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import { calculatePlayerStats } from "@/lib/player-stats-service";
import type { Match, MatchAssist, MatchGoal, MatchGoalkeeperStat, MatchTeam, Player, Round, Season } from "@/types";

export const Route = createFileRoute("/_authenticated/app/jogadores/$id")({
  head: () => ({ meta: [{ title: "Perfil do jogador | Resenha FC" }] }),
  component: PlayerDetailsPage,
});

function PlayerDetailsPage() {
  const { id } = Route.useParams();
  const [player, setPlayer] = useState<Player | null>(null);
  const [position, setPosition] = useState<{ code: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<ReturnType<typeof calculatePlayerStats> | null>(null);
  const [history, setHistory] = useState<{ season: Season; stats: ReturnType<typeof calculatePlayerStats> }[]>([]);

  useEffect(() => {
    async function loadPlayer() {
      const { data, error: playerError } = await supabase.from("players").select("*").eq("id", id).maybeSingle();
      if (playerError || !data) { setError(true); setLoading(false); return; }
      setPlayer(data as Player);
      const [{ data: relation }, { data: matches }, { data: goals }, { data: assists }, { data: keepers }, { data: teams }, { data: rounds }, { data: seasons }, { data: memberships }] = await Promise.all([
        supabase.from("player_positions").select("position_id, positions(code, name)").eq("player_id", id).eq("is_primary", true).maybeSingle(),
        supabase.from("matches").select("*").eq("status", "finished"), supabase.from("match_goals").select("*").eq("player_id", id), supabase.from("match_assists").select("*").eq("player_id", id), supabase.from("goalkeeper_stats").select("*"), supabase.from("draw_teams").select("id, draw_id, team_number, total_rating"), supabase.from("rounds").select("*"), supabase.from("seasons").select("*"), supabase.from("draw_team_players").select("team_id, draw_id").eq("player_id", id),
      ]);
      const positionData = relation?.positions;
      if (positionData && !Array.isArray(positionData)) setPosition(positionData as { code: string; name: string });
      const playerTeamIds = ((memberships ?? []) as { team_id: string }[]).map((membership) => membership.team_id);
      const statArgs = [id, (matches ?? []) as Match[], (goals ?? []) as MatchGoal[], (assists ?? []) as MatchAssist[], (keepers ?? []) as MatchGoalkeeperStat[], (teams ?? []) as MatchTeam[], playerTeamIds, (rounds ?? []) as Round[]] as const;
      setStats(calculatePlayerStats(...statArgs));
      setHistory(((seasons ?? []) as Season[]).map((season) => ({ season, stats: calculatePlayerStats(...statArgs, { win: 3, draw: 1, loss: 0 }, { seasonId: season.id }) })).filter((item) => item.stats.matches > 0));
      setLoading(false);
    }
    void loadPlayer();
  }, [id]);

  if (loading) return <AppLayout title="Perfil do jogador"><LoadingState label="Carregando jogador..." /></AppLayout>;
  if (error || !player) return <AppLayout title="Perfil do jogador"><ErrorState title="Não foi possível carregar o jogador." /></AppLayout>;

  return (
    <AppLayout title="Perfil do jogador">
      <Button variant="ghost" asChild className="mb-4"><Link to="/app/jogadores"><ArrowLeft /> Voltar para jogadores</Link></Button>
      <div className="grid gap-6 sm:grid-cols-[minmax(220px,360px)_1fr] sm:items-start"><div className="mx-auto w-full max-w-sm"><PlayerCard player={player} positions={position ? [position.code] : []} interactive={false} /></div><section className="card-surface p-5"><h2 className="font-display text-2xl font-bold text-navy">{player.name}</h2>{player.nickname ? <p className="text-meta mt-1">{player.nickname}</p> : null}<div className="mt-4"><PlayerStatusBadge status={player.status} /></div><p className="text-meta mt-4">Posição principal: <strong className="text-navy">{position?.code ?? "Não definida"}</strong></p><p className="text-meta mt-2">Número: <strong className="text-navy">{player.shirt_number ?? "Não informado"}</strong></p></section></div>
      <SectionCard title="Estatísticas" icon={Goal} className="mt-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Jogos" value={stats?.matches ?? 0} /><Stat label="Gols" value={stats?.goals ?? 0} /><Stat label="Assistências" value={stats?.assists ?? 0} /><Stat label="Aproveitamento" value={stats?.pointsPossible ? `${Math.round((stats.pointsWon / stats.pointsPossible) * 100)}%` : "Dados insuficientes"} /></div><div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm"><Stat label="Vitórias" value={stats?.wins ?? 0} /><Stat label="Empates" value={stats?.draws ?? 0} /><Stat label="Derrotas" value={stats?.losses ?? 0} /></div></SectionCard>
      {stats?.goalkeeper ? <SectionCard title="Estatísticas de goleiro" icon={UserRound} className="mt-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><Stat label="Jogos no gol" value={stats.goalkeeper.matches} /><Stat label="Gols sofridos" value={stats.goalkeeper.goalsConceded} /><Stat label="Clean sheets" value={stats.goalkeeper.cleanSheets} /><Stat label="Defesas" value={stats.goalkeeper.saves ?? "Dados não informados"} /><Stat label="Índice" value={stats.goalkeeper.performanceIndex} /></div></SectionCard> : null}
      <SectionCard title="Histórico por temporada" icon={Trophy} className="mt-4">{history.length ? <div className="grid gap-3">{history.map((item) => <div key={item.season.id} className="border-b border-border pb-3"><h3 className="font-display font-bold text-navy">{item.season.name}</h3><p className="text-meta">{item.stats.matches} jogos · {item.stats.goals} gols · {item.stats.assists} assistências</p></div>)}</div> : <p className="text-meta">Nenhum histórico esportivo registrado.</p>}</SectionCard>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-md border border-border p-3 text-center"><strong className="block font-display text-xl text-navy">{value}</strong><span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span></div>; }
