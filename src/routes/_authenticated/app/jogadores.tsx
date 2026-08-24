import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { PlayerCard } from "@/components/players/PlayerCard";
import { ComingSoon } from "@/components/feedback/states";
import { SectionCard } from "@/components/ui/section-card";
import type { Player } from "@/types";

export const Route = createFileRoute("/_authenticated/app/jogadores")({
  head: () => ({ meta: [{ title: "Jogadores | Resenha FC" }] }),
  component: PlayersPage,
});

const samplePlayers: Player[] = [];

function PlayersPage() {
  return (
    <AppLayout title="Jogadores" subtitle="Conheça o elenco do Resenha FC.">
      {samplePlayers.length > 0 ? (
        <div className="grid gap-3">{samplePlayers.map((player) => <PlayerCard key={player.id} player={player} />)}</div>
      ) : (
        <SectionCard title="Elenco" icon={Users}>
          <ComingSoon title="Jogadores em breve" description="O elenco será exibido aqui assim que os cadastros forem liberados." />
        </SectionCard>
      )}
    </AppLayout>
  );
}