import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Goal,
  Megaphone,
  Settings,
  ShieldCheck,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { LoadingState, ErrorState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import { calculateAssists, calculateScorers } from "@/lib/rankings-service";
import type { Match, MatchAssist, MatchGoal, Player, Round, Tournament } from "@/types";

export const Route = createFileRoute("/_authenticated/app/admin/")({
  head: () => ({
    meta: [{ title: "Painel administrativo | Resenha FC" }],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      throw redirect({ to: "/login" });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      throw redirect({ to: "/app/principal" });
    }
  },
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState<{
    players: number;
    matches: number;
    goals: number;
    assists: number;
    nextRound: Round | null;
    confirmed: number;
    pending: number;
    absent: number;
    tournament: Tournament | null;
    scorer: string | null;
    assister: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);

      const [
        playersResult,
        matchesResult,
        goalsResult,
        assistsResult,
        roundsResult,
        tournamentsResult,
      ] = await Promise.all([
        supabase.from("players").select("*").eq("status", "active"),
        supabase.from("matches").select("*").eq("status", "finished"),
        supabase.from("match_goals").select("*"),
        supabase.from("match_assists").select("*"),
        supabase
          .from("rounds")
          .select("*")
          .gte("scheduled_date", today)
          .not("status", "in", "(cancelled,finished)")
          .order("scheduled_date")
          .order("start_time")
          .limit(1),
        supabase.from("tournaments").select("*").eq("status", "active").limit(1),
      ]);

      if (playersResult.error) {
        setError(true);
        setLoading(false);
        return;
      }

      const players = playersResult.data ?? [];
      const matches = matchesResult.data ?? [];
      const goals = goalsResult.data ?? [];
      const assists = assistsResult.data ?? [];
      const roundData = roundsResult.data ?? [];
      const tournaments = tournamentsResult.data ?? [];

      const nextRound = (roundData[0] as Round | undefined) ?? null;
      let confirmed = 0;
      let pending = 0;
      let absent = 0;

      if (nextRound) {
        const { data: participants } = await supabase
          .from("round_players")
          .select("participation_status")
          .eq("round_id", nextRound.id);

        confirmed =
          participants?.filter((item) => item.participation_status === "confirmed").length ?? 0;
        pending =
          participants?.filter((item) => item.participation_status === "pending").length ?? 0;
        absent = participants?.filter((item) => item.participation_status === "absent").length ?? 0;
      }

      const playerList = players as Player[];

      setStats({
        players: playerList.length,
        matches: (matches as Match[]).length,
        goals: (goals as MatchGoal[]).length,
        assists: (assists as MatchAssist[]).length,
        nextRound,
        confirmed,
        pending,
        absent,
        tournament: (tournaments[0] as Tournament | undefined) ?? null,
        scorer: calculateScorers(goals as MatchGoal[], playerList)[0]?.playerName ?? null,
        assister: calculateAssists(assists as MatchAssist[], playerList)[0]?.playerName ?? null,
      });

      setLoading(false);
    }

    void load();
  }, []);

  if (loading) {
    return (
      <AppLayout title="Painel Administrativo">
        <LoadingState label="Carregando painel..." />
      </AppLayout>
    );
  }

  if (error || !stats) {
    return (
      <AppLayout title="Painel Administrativo">
        <ErrorState title="Não foi possível carregar os dados." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Painel Administrativo" subtitle="Visão centralizada do Resenha FC.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={Users} label="Jogadores ativos" value={stats.players} />
        <Metric icon={Swords} label="Partidas realizadas" value={stats.matches} />
        <Metric icon={Goal} label="Gols" value={stats.goals} />
        <Metric icon={Activity} label="Assistências" value={stats.assists} />
      </div>

      {stats.nextRound ? (
        <SectionCard title="Próxima rodada" icon={CalendarDays} className="mt-5">
          <p className="font-display text-xl font-bold text-navy">
            {new Date(`${stats.nextRound.scheduled_date}T12:00:00`).toLocaleDateString("pt-BR")} ·{" "}
            {stats.nextRound.start_time?.slice(0, 5) ?? "horário não informado"}
          </p>
          <p className="text-meta mt-1">
            {stats.nextRound.location_name} · {stats.confirmed} confirmados · {stats.pending}{" "}
            pendentes · {stats.absent} ausentes
          </p>
        </SectionCard>
      ) : null}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <SectionCard title="Destaques" icon={Trophy}>
          <p className="text-meta">
            Artilheiro: <strong className="text-navy">{stats.scorer ?? "Sem dados"}</strong>
          </p>
          <p className="text-meta mt-2">
            Garçom: <strong className="text-navy">{stats.assister ?? "Sem dados"}</strong>
          </p>
          <p className="text-meta mt-2">
            Torneio atual:{" "}
            <strong className="text-navy">
              {stats.tournament?.name ?? "Nenhum torneio ativo"}
            </strong>
          </p>
        </SectionCard>

        <SectionCard title="Ações rápidas" icon={ClipboardList}>
          <div className="grid gap-2 sm:grid-cols-2">
            <QuickLink to="/app/admin/rodadas" icon={CalendarDays} label="Nova rodada" />
            <QuickLink to="/app/jogadores" icon={Users} label="Novo jogador" />
            <QuickLink to="/app/torneios" icon={Trophy} label="Novo torneio" />
            <QuickLink to="/app/sorteio" icon={BarChart3} label="Realizar sorteio" />
            <QuickLink to="/app/partidas" icon={Swords} label="Nova partida" />
            <QuickLink to="/app/admin/avisos" icon={Megaphone} label="Novo aviso" />
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Gestão" icon={ShieldCheck} className="mt-5">
        <div className="grid gap-2 sm:grid-cols-2">
          <QuickLink to="/app/admin/relatorios" icon={BarChart3} label="Relatórios" />
          <QuickLink to="/app/admin/auditoria" icon={ClipboardList} label="Auditoria" />
          <QuickLink to="/app/admin/configuracoes" icon={Settings} label="Configurações" />
        </div>
      </SectionCard>
    </AppLayout>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="card-surface p-4">
      <Icon className="size-5 text-orange" />
      <strong className="mt-3 block font-display text-2xl text-navy">{value}</strong>
      <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to:
    | "/app/admin/rodadas"
    | "/app/jogadores"
    | "/app/torneios"
    | "/app/sorteio"
    | "/app/partidas"
    | "/app/admin/avisos"
    | "/app/admin/relatorios"
    | "/app/admin/auditoria"
    | "/app/admin/configuracoes";
  icon: typeof Users;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="card-surface flex items-center gap-2 p-3 text-sm font-semibold text-navy"
    >
      <Icon className="size-4 text-orange" />
      {label}
    </Link>
  );
}
