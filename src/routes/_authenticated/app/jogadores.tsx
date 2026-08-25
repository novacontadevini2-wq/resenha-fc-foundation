import { createFileRoute } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PlayerFilters, type PlayerStatusFilter } from "@/components/players/PlayerFilters";
import { PlayerForm } from "@/components/players/PlayerForm";
import { LoadingState, EmptyState, ErrorState } from "@/components/feedback/states";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Player, PlayerStatus } from "@/types";

export const Route = createFileRoute("/_authenticated/app/jogadores")({
  head: () => ({ meta: [{ title: "Jogadores | Resenha FC" }] }),
  component: PlayersPage,
});

function PlayersPage() {
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [positions, setPositions] = useState<{ id: string; code: string; name: string }[]>([]);
  const [playerPositions, setPlayerPositions] = useState<{ player_id: string; position_id: string; is_primary: boolean }[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PlayerStatusFilter>("active");
  const [position, setPosition] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function loadPlayers() {
    setLoading(true);
    setError(false);
    const [playersResult, positionsResult, refsResult] = await Promise.all([
      supabase.from("players").select("*").order("status", { ascending: true }).order("name", { ascending: true }),
      supabase.from("positions").select("id, code, name").eq("active", true).order("code"),
      supabase.from("player_positions").select("player_id, position_id, is_primary"),
    ]);
    if (playersResult.error || positionsResult.error || refsResult.error) {
      setError(true);
    } else {
      setPlayers((playersResult.data ?? []) as Player[]);
      setPositions(positionsResult.data ?? []);
      setPlayerPositions(refsResult.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { void loadPlayers(); }, []);

  const positionById = useMemo(() => new Map(positions.map((item) => [item.id, item])), [positions]);
  const visiblePlayers = useMemo(() => players.filter((player) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [player.name, player.nickname ?? "", player.shirt_number?.toString() ?? ""].some((value) => value.toLowerCase().includes(term));
    const refs = playerPositions.filter((ref) => ref.player_id === player.id);
    const matchesPosition = position === "all" || refs.some((ref) => ref.position_id === position);
    return matchesSearch && matchesPosition && (status === "all" || player.status === status);
  }), [players, playerPositions, position, search, status]);

  async function savePlayer(values: { name: string; nickname: string | null; shirt_number: number | null; positionId: string; overall_rating: number; photo_url: string | null; status: PlayerStatus }) {
    const payload = { name: values.name, nickname: values.nickname, shirt_number: values.shirt_number, overall_rating: values.overall_rating, photo_url: values.photo_url, status: values.status };
    const result = editingPlayer
      ? await supabase.from("players").update(payload).eq("id", editingPlayer.id)
      : await supabase.from("players").insert(payload).select("id").single();
    if (result.error) throw result.error;
    const playerId = editingPlayer?.id ?? result.data?.id;
    if (!playerId) throw new Error("Jogador não foi criado.");
    if (editingPlayer) await supabase.from("player_positions").delete().eq("player_id", playerId);
    const { error: positionError } = await supabase.from("player_positions").insert({ player_id: playerId, position_id: values.positionId, is_primary: true });
    if (positionError) throw positionError;
    setFormOpen(false);
    setEditingPlayer(null);
    toast.success(editingPlayer ? "Jogador atualizado com sucesso." : "Jogador cadastrado com sucesso.");
    await loadPlayers();
  }

  async function changeStatus(player: Player, nextStatus: PlayerStatus) {
    const message = nextStatus === "inactive" ? "Tem certeza que deseja inativar este jogador?" : nextStatus === "active" ? "Tem certeza que deseja reativar este jogador?" : "Tem certeza que deseja suspender este jogador?";
    if (!window.confirm(message)) return;
    const { error: updateError } = await supabase.from("players").update({ status: nextStatus }).eq("id", player.id);
    if (updateError) toast.error(nextStatus === "active" ? "Não foi possível reativar o jogador." : "Não foi possível alterar o status do jogador.");
    else { toast.success(nextStatus === "active" ? "Jogador reativado com sucesso." : "Status do jogador atualizado."); await loadPlayers(); }
  }

  return (
    <AppLayout title="Jogadores" subtitle="Conheça o elenco do Resenha FC.">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-subtitle">Elenco</h2><p className="text-meta">{visiblePlayers.length} jogador{visiblePlayers.length === 1 ? "" : "es"} encontrado{visiblePlayers.length === 1 ? "" : "s"}.</p></div>{isAdmin ? <Button onClick={() => { setEditingPlayer(null); setFormOpen(true); }}><Plus /> Novo jogador</Button> : null}</div>
      <div className="mb-4"><PlayerFilters search={search} status={status} position={position} positions={positions} onSearchChange={setSearch} onStatusChange={setStatus} onPositionChange={setPosition} /></div>
      {loading ? <LoadingState label="Carregando jogadores..." /> : error ? <ErrorState title="Não foi possível carregar os jogadores." onRetry={() => void loadPlayers()} /> : visiblePlayers.length === 0 ? <EmptyState title="Nenhum jogador encontrado." /> : <div className="grid gap-3">{visiblePlayers.map((player) => <div key={player.id} className="grid gap-2"><PlayerCard player={player} positions={playerPositions.filter((ref) => ref.player_id === player.id).sort((a, b) => Number(b.is_primary) - Number(a.is_primary)).map((ref) => positionById.get(ref.position_id)?.code).filter((code): code is string => Boolean(code))} />{isAdmin ? <div className="flex flex-wrap gap-2 px-1"><Button size="sm" variant="outline" onClick={() => { setEditingPlayer(player); setFormOpen(true); }}>Editar</Button>{player.status === "active" ? <Button size="sm" variant="outline" onClick={() => void changeStatus(player, "inactive")}>Inativar jogador</Button> : player.status === "inactive" ? <Button size="sm" variant="outline" onClick={() => void changeStatus(player, "active")}>Reativar jogador</Button> : null}{player.status !== "suspended" ? <Button size="sm" variant="ghost" onClick={() => void changeStatus(player, "suspended")}>Suspender</Button> : <Button size="sm" variant="ghost" onClick={() => void changeStatus(player, "active")}>Reativar</Button>}</div> : null}</div>)}</div>}
      <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent><DialogHeader><DialogTitle>{editingPlayer ? "Editar jogador" : "Novo jogador"}</DialogTitle><DialogDescription>Preencha os dados do jogador do Resenha FC.</DialogDescription></DialogHeader><PlayerForm key={editingPlayer?.id ?? "new"} player={editingPlayer} positions={positions} onSubmit={savePlayer} onCancel={() => setFormOpen(false)} /></DialogContent></Dialog>
    </AppLayout>
  );
}