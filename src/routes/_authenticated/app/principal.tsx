import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, CalendarDays, Shuffle, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/ui/section-card";
import { CLUB } from "@/lib/club-config";
import { NextRoundCard } from "@/components/rounds/NextRoundCard";
import { supabase } from "@/integrations/supabase/client";
import type { Round } from "@/types";

export const Route = createFileRoute("/_authenticated/app/principal")({
  head: () => ({ meta: [{ title: "Principal | Resenha FC" }] }),
  component: PrincipalPage,
});

function PrincipalPage() {
  const [nextRound, setNextRound] = useState<Round | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);
  useEffect(() => {
    async function loadNextRound() {
      const { data } = await supabase.from("rounds").select("*").gte("scheduled_date", new Date().toISOString().slice(0, 10)).not("status", "in", "(cancelled,finished)").order("scheduled_date").order("start_time").limit(1).maybeSingle();
      if (!data) return;
      setNextRound(data as Round);
      const { count } = await supabase.from("round_players").select("id", { count: "exact", head: true }).eq("round_id", data.id).eq("participation_status", "confirmed");
      setConfirmedCount(count ?? 0);
    }
    void loadNextRound();
  }, []);
  return (
    <AppLayout title="Principal" subtitle={`${CLUB.schedule.dayLabel} · ${CLUB.schedule.timeLabel}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        {nextRound ? <NextRoundCard round={nextRound} confirmedCount={confirmedCount} /> : <SectionCard title="Próxima resenha" icon={CalendarDays}><p className="text-lg font-semibold text-navy">Nenhuma próxima rodada cadastrada.</p><p className="text-meta mt-1">As próximas informações aparecerão aqui.</p></SectionCard>}
        <SectionCard title="Local" icon={Trophy}>
          <p className="text-lg font-semibold text-navy">{CLUB.venue.name}</p>
          <p className="text-meta mt-1">{CLUB.venue.address}</p>
        </SectionCard>
      </div>
      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <QuickLink to="/app/jogadores" icon={Users} label="Jogadores" />
        <QuickLink to="/app/sorteio" icon={Shuffle} label="Fazer sorteio" />
        <QuickLink to="/app/torneios" icon={Trophy} label="Torneios" />
        <QuickLink to="/app/rodadas" icon={CalendarDays} label="Rodadas" />
        <QuickLink to="/app/rankings" icon={BarChart3} label="Rankings" />
      </section>
    </AppLayout>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: "/app/jogadores" | "/app/sorteio" | "/app/torneios" | "/app/rodadas" | "/app/rankings"; icon: typeof Users; label: string }) {
  return (
    <Link to={to} className="card-surface flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-navy"><Icon className="size-5" /></span>
      <span className="font-semibold text-navy">{label}</span>
    </Link>
  );
}