import { createFileRoute } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { ComingSoon } from "@/components/feedback/states";
import { SectionCard } from "@/components/ui/section-card";

export const Route = createFileRoute("/_authenticated/app/torneios")({
  head: () => ({ meta: [{ title: "Torneios | Resenha FC" }] }),
  component: TournamentsPage,
});

function TournamentsPage() {
  return (
    <AppLayout title="Torneios" subtitle="Acompanhe temporadas, rodadas e resultados.">
      <SectionCard title="Temporadas" icon={Trophy}>
        <ComingSoon title="Torneios em breve" description="As temporadas e classificações aparecerão aqui." />
      </SectionCard>
    </AppLayout>
  );
}