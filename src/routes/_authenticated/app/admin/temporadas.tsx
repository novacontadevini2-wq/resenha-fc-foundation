import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Season, SeasonStatus } from "@/types";

export const Route = createFileRoute("/_authenticated/app/admin/temporadas")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: admin } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
    if (!admin) throw redirect({ to: "/app/principal" });
  },
  component: SeasonsAdminPage,
});

function SeasonsAdminPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [roundCounts, setRoundCounts] = useState<Record<string, number>>({});

  async function load() {
    const [{ data, error: loadError }, { data: rounds }] = await Promise.all([supabase.from("seasons").select("*").order("start_date", { ascending: false }), supabase.from("rounds").select("season_id")]);
    if (loadError) setError(true); else { setSeasons((data ?? []) as Season[]); setRoundCounts((rounds ?? []).reduce<Record<string, number>>((result, round) => { if (round.season_id) result[round.season_id] = (result[round.season_id] ?? 0) + 1; return result; }, {})); }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function createSeason(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !start || (end && end < start)) { toast.error("Confira o nome e as datas da temporada."); return; }
    setSaving(true);
    const { error: saveError } = await supabase.from("seasons").insert({ name: name.trim(), start_date: start, end_date: end || null, status: "planned" });
    setSaving(false);
    if (saveError) toast.error("Não foi possível criar a temporada."); else { toast.success("Temporada criada com sucesso."); setName(""); setStart(""); setEnd(""); await load(); }
  }

  async function editSeason(season: Season) {
    const nextName = window.prompt("Nome da temporada", season.name)?.trim();
    if (!nextName || nextName === season.name) return;
    const { error: updateError } = await supabase.from("seasons").update({ name: nextName }).eq("id", season.id);
    if (updateError) toast.error("Não foi possível editar a temporada."); else { toast.success("Temporada atualizada."); await load(); }
  }

  async function changeStatus(season: Season, status: SeasonStatus) {
    if ((status === "finished" || status === "archived") && !window.confirm(`Tem certeza que deseja ${status === "finished" ? "finalizar" : "arquivar"} esta temporada?`)) return;
    if (status === "active") {
      const { error: deactivateError } = await supabase.from("seasons").update({ status: "finished" }).eq("status", "active");
      if (deactivateError) { toast.error("Não foi possível ativar a temporada."); return; }
    }
    const { error: updateError } = await supabase.from("seasons").update({ status }).eq("id", season.id);
    if (updateError) toast.error("Não foi possível atualizar a temporada."); else { toast.success(status === "active" ? "Temporada ativada." : "Temporada atualizada."); await load(); }
  }

  return <AppLayout title="Temporadas" subtitle="Organize os períodos do Resenha FC.">
    <form onSubmit={createSeason} className="card-surface mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_160px_160px_auto] sm:items-end">
      <label className="grid gap-1 text-sm font-medium text-navy">Nome<Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Temporada 2026" required /></label>
      <label className="grid gap-1 text-sm font-medium text-navy">Data inicial<Input type="date" value={start} onChange={(event) => setStart(event.target.value)} required /></label>
      <label className="grid gap-1 text-sm font-medium text-navy">Data final<Input type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} /></label>
      <Button disabled={saving}>{saving ? "Salvando..." : "Criar temporada"}</Button>
    </form>
    {loading ? <LoadingState label="Carregando temporadas..." /> : error ? <ErrorState title="Não foi possível carregar as temporadas." onRetry={() => void load()} /> : seasons.length === 0 ? <EmptyState title="Nenhuma temporada encontrada." /> : <div className="grid gap-3">{seasons.map((season) => <article key={season.id} className="card-surface flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-lg font-bold text-navy">{season.name}</h2><p className="text-meta">{new Date(`${season.start_date}T12:00:00`).toLocaleDateString("pt-BR")} {season.end_date ? `— ${new Date(`${season.end_date}T12:00:00`).toLocaleDateString("pt-BR")}` : "— presente"}</p><p className="text-meta">{roundCounts[season.id] ?? 0} rodada{roundCounts[season.id] === 1 ? "" : "s"}</p><p className="text-xs font-semibold uppercase text-orange">{season.status}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void editSeason(season)}>Editar</Button>{season.status !== "active" && season.status !== "finished" ? <Button size="sm" onClick={() => void changeStatus(season, "active")}>Ativar temporada</Button> : null}{season.status === "active" ? <Button size="sm" variant="outline" onClick={() => void changeStatus(season, "finished")}>Finalizar</Button> : null}{season.status === "finished" ? <Button size="sm" variant="outline" onClick={() => void changeStatus(season, "archived")}>Arquivar</Button> : null}</div></article>)}</div>}
  </AppLayout>;
}
