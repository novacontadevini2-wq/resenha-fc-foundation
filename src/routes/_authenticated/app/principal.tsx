import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Shuffle, Trophy, Users } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/ui/section-card";
import { CLUB } from "@/lib/club-config";

export const Route = createFileRoute("/_authenticated/app/principal")({
  head: () => ({ meta: [{ title: "Principal | Resenha FC" }] }),
  component: PrincipalPage,
});

function PrincipalPage() {
  return (
    <AppLayout title="Principal" subtitle={`${CLUB.schedule.dayLabel} · ${CLUB.schedule.timeLabel}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title="Próxima resenha" icon={CalendarDays}>
          <p className="text-lg font-semibold text-navy">A próxima rodada está chegando.</p>
          <p className="text-meta mt-1">Confirme sua presença e acompanhe os detalhes da partida.</p>
        </SectionCard>
        <SectionCard title="Local" icon={Trophy}>
          <p className="text-lg font-semibold text-navy">{CLUB.venue.name}</p>
          <p className="text-meta mt-1">{CLUB.venue.address}</p>
        </SectionCard>
      </div>
      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <QuickLink to="/app/jogadores" icon={Users} label="Jogadores" />
        <QuickLink to="/app/sorteio" icon={Shuffle} label="Fazer sorteio" />
        <QuickLink to="/app/torneios" icon={Trophy} label="Torneios" />
      </section>
    </AppLayout>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: "/app/jogadores" | "/app/sorteio" | "/app/torneios"; icon: typeof Users; label: string }) {
  return (
    <Link to={to} className="card-surface flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-navy"><Icon className="size-5" /></span>
      <span className="font-semibold text-navy">{label}</span>
    </Link>
  );
}