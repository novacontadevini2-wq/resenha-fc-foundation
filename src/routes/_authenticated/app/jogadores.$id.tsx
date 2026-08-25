import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { PlayerStatusBadge } from "@/components/players/PlayerStatusBadge";
import { PlayerCard } from "@/components/players/PlayerCard";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import type { Player } from "@/types";

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

  useEffect(() => {
    async function loadPlayer() {
      const { data, error: playerError } = await supabase.from("players").select("*").eq("id", id).maybeSingle();
      if (playerError || !data) { setError(true); setLoading(false); return; }
      setPlayer(data as Player);
      const { data: relation } = await supabase.from("player_positions").select("position_id, positions(code, name)").eq("player_id", id).eq("is_primary", true).maybeSingle();
      const positionData = relation?.positions;
      if (positionData && !Array.isArray(positionData)) setPosition(positionData as { code: string; name: string });
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
      <SectionCard title="Informações adicionais" icon={UserRound} className="mt-4"><p className="text-meta">Estatísticas e histórico do jogador estarão disponíveis em futuras fases.</p></SectionCard>
    </AppLayout>
  );
}
