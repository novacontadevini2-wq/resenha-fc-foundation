import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Player, PlayerStatus } from "@/types";

interface PlayerFormProps {
  player?: Player | null;
  positions: { id: string; code: string; name: string }[];
  onSubmit: (values: { name: string; nickname: string | null; shirt_number: number | null; positionId: string; overall_rating: number; photo_url: string | null; status: PlayerStatus }) => Promise<void>;
  onCancel: () => void;
}

export function PlayerForm({ player, positions, onSubmit, onCancel }: PlayerFormProps) {
  const [name, setName] = useState(player?.name ?? "");
  const [nickname, setNickname] = useState(player?.nickname ?? "");
  const [shirtNumber, setShirtNumber] = useState(player?.shirt_number?.toString() ?? "");
  const [positionId, setPositionId] = useState("");
  const [rating, setRating] = useState(player?.overall_rating?.toString() ?? "5");
  const [photoUrl, setPhotoUrl] = useState(player?.photo_url ?? "");
  const [status, setStatus] = useState<PlayerStatus>(player?.status ?? "active");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const playerId = player?.id ?? "";
    if (!playerId || positionId) return;
    void loadPosition();
    async function loadPosition() {
      const { data } = await supabase.from("player_positions").select("position_id").eq("player_id", playerId).eq("is_primary", true).maybeSingle();
      if (data) setPositionId(data.position_id);
    }
  }, [player, positionId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    const numericRating = Number(rating);
    const numericShirt = shirtNumber.trim() ? Number(shirtNumber) : null;
    if (!normalizedName) return setError("Informe o nome do jogador.");
    if (!positionId) return setError("Selecione uma posição.");
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) return setError("A avaliação deve estar entre 1 e 5.");
    if (numericShirt !== null && (!Number.isInteger(numericShirt) || numericShirt < 0 || numericShirt > 99)) return setError("Informe um número entre 0 e 99.");
    if (photoUrl.trim() && !/^https?:\/\//i.test(photoUrl.trim())) return setError("A foto deve ser uma URL válida.");
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ name: normalizedName, nickname: nickname.trim() || null, shirt_number: numericShirt, positionId, overall_rating: numericRating, photo_url: photoUrl.trim() || null, status });
    } catch {
      setError("Não foi possível salvar o jogador.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome *"><Input value={name} onChange={(event) => setName(event.target.value)} required /></Field>
        <Field label="Apelido"><Input value={nickname} onChange={(event) => setNickname(event.target.value)} /></Field>
        <Field label="Número"><Input type="number" min="0" max="99" value={shirtNumber} onChange={(event) => setShirtNumber(event.target.value)} /></Field>
        <Field label="Posição *"><Select value={positionId} onValueChange={setPositionId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{positions.map((item) => <SelectItem key={item.id} value={item.id}>{item.code} · {item.name}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Avaliação (1 a 5) *"><Input type="number" min="1" max="5" step="1" value={rating} onChange={(event) => setRating(event.target.value)} /></Field>
        <Field label="Status"><Select value={status} onValueChange={(value) => setStatus(value as PlayerStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="inactive">Inativo</SelectItem><SelectItem value="suspended">Suspenso</SelectItem></SelectContent></Select></Field>
      </div>
      <Field label="URL da foto"><Input type="url" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://..." /></Field>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar jogador"}</Button></div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium text-navy"><span>{label}</span>{children}</label>;
}
