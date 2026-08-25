import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { PlayerStatusBadge } from "@/components/players/PlayerStatusBadge";
import { StarRating } from "@/components/players/StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
      <section className="card-surface flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <Avatar className="size-28 border-4 border-accent"><AvatarImage src={player.photo_url ?? undefined} alt={player.name} /><AvatarFallback className="bg-navy text-2xl text-navy-foreground"><UserRound /></AvatarFallback></Avatar>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-2xl font-bold text-navy">{player.name}</h2>{player.shirt_number != null ? <span className="rounded-md bg-navy px-2 py-1 text-sm font-bold text-navy-foreground">#{player.shirt_number}</span> : null}</div>{player.nickname ? <p className="text-meta mt-1">{player.nickname}</p> : null}<div className="mt-3 flex flex-wrap items-center gap-3"><span className="font-semibold text-navy">{position?.code ?? "Posição não definida"}</span><StarRating value={player.overall_rating} /><PlayerStatusBadge status={player.status} /></div></div>
      </section>
      <SectionCard title="Informações adicionais" icon={UserRound} className="mt-4"><p className="text-meta">Estatísticas e histórico do jogador estarão disponíveis em futuras fases.</p></SectionCard>
    </AppLayout>
  );
}
