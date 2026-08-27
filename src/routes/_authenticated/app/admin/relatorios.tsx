import { createFileRoute, redirect } from "@tanstack/react-router";
import { BarChart3, FileText } from "lucide-react";
import { useEffect, useState } from "react";

import { ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import type { Match, MatchAssist, MatchGoal, Player, Tournament } from "@/types";

export const Route = createFileRoute("/_authenticated/app/admin/relatorios")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: admin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!admin) throw redirect({ to: "/app/principal" });
  },
  component: ReportsPage,
});
function ReportsPage() {
  const [data, setData] = useState<{
    players: Player[];
    matches: Match[];
    goals: MatchGoal[];
    assists: MatchAssist[];
    tournaments: Tournament[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    async function load() {
      const [
        { data: players },
        { data: matches },
        { data: goals },
        { data: assists },
        { data: tournaments },
      ] = await Promise.all([
        supabase.from("players").select("*"),
        supabase.from("matches").select("*"),
        supabase.from("match_goals").select("*"),
        supabase.from("match_assists").select("*"),
        supabase.from("tournaments").select("*"),
      ]);
      if (!players || !matches || !goals || !assists || !tournaments) setError(true);
      else
        setData({
          players: players as Player[],
          matches: matches as Match[],
          goals: goals as MatchGoal[],
          assists: assists as MatchAssist[],
          tournaments: tournaments as Tournament[],
        });
      setLoading(false);
    }
    void load();
  }, []);
  if (loading)
    return (
      <AppLayout title="Relatórios">
        <LoadingState label="Carregando relatórios..." />
      </AppLayout>
    );
  if (error || !data)
    return (
      <AppLayout title="Relatórios">
        <ErrorState title="Não foi possível carregar os dados." />
      </AppLayout>
    );
  const finished = data.matches.filter((match) => match.status === "finished");
  const cancelled = data.matches.filter((match) => match.status === "cancelled");
  const average = finished.length
    ? (
        data.goals.filter((goal) => finished.some((match) => match.id === goal.match_id)).length /
        finished.length
      ).toFixed(1)
    : "Dados insuficientes";
  return (
    <AppLayout title="Relatórios" subtitle="Dados consolidados do Resenha FC.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Report label="Jogadores" value={data.players.length} />
        <Report label="Partidas" value={data.matches.length} />
        <Report label="Finalizadas" value={finished.length} />
        <Report label="Gols" value={data.goals.length} />
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <SectionCard title="Relatório de partidas" icon={BarChart3}>
          <p className="text-meta">
            Finalizadas: <strong>{finished.length}</strong>
          </p>
          <p className="text-meta mt-2">
            Canceladas: <strong>{cancelled.length}</strong>
          </p>
          <p className="text-meta mt-2">
            Média de gols por partida: <strong>{average}</strong>
          </p>
          <p className="text-meta mt-2">
            Assistências registradas: <strong>{data.assists.length}</strong>
          </p>
        </SectionCard>
        <SectionCard title="Relatório de torneios" icon={FileText}>
          {data.tournaments.length ? (
            data.tournaments.map((tournament) => (
              <p key={tournament.id} className="text-meta border-b border-border py-2">
                <strong className="text-navy">{tournament.name}</strong> · {tournament.status}
              </p>
            ))
          ) : (
            <p className="text-meta">Não há dados suficientes para este período.</p>
          )}
        </SectionCard>
      </div>
    </AppLayout>
  );
}
function Report({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-surface p-4">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      <strong className="mt-2 block font-display text-2xl text-navy">{value}</strong>
    </div>
  );
}
