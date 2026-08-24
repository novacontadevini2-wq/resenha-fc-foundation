import { createFileRoute } from "@tanstack/react-router";
import { Shuffle } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { ComingSoon } from "@/components/feedback/states";
import { SectionCard } from "@/components/ui/section-card";

export const Route = createFileRoute("/_authenticated/app/sorteio")({
  head: () => ({ meta: [{ title: "Sorteio | Resenha FC" }] }),
  component: DrawPage,
});

function DrawPage() {
  return (
    <AppLayout title="Sorteio" subtitle="Monte equipes equilibradas para a próxima resenha.">
      <SectionCard title="Sorteio de equipes" icon={Shuffle}>
        <ComingSoon title="Sorteio em breve" description="A escalação automática estará disponível quando o elenco da rodada estiver confirmado." />
      </SectionCard>
    </AppLayout>
  );
}