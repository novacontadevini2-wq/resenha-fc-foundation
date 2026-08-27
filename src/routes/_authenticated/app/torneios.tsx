import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Season, Tournament } from "@/types";

export const Route = createFileRoute("/_authenticated/app/torneios")({
  head: () => ({ meta: [{ title: "Torneios | Resenha FC" }] }),
  component: TournamentsPage,
});

function TournamentsPage() {
  const { isAdmin } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [name, setName] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data, error: tournamentError }, { data: seasonData }] = await Promise.all([
      supabase
        .from("tournaments")
        .select("*")
        .order("start_date", { ascending: false, nullsFirst: false }),
      supabase.from("seasons").select("*").order("start_date", { ascending: false }),
    ]);
    if (tournamentError) setError(true);
    else {
      setTournaments((data ?? []) as Tournament[]);
      setSeasons((seasonData ?? []) as Season[]);
    }
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);
  async function createTournament(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !seasonId || (endDate && startDate && endDate < startDate)) {
      toast.error("Confira nome, temporada e datas do torneio.");
      return;
    }
    setSaving(true);
    const { error: saveError } = await supabase
      .from("tournaments")
      .insert({
        name: name.trim(),
        season_id: seasonId,
        start_date: startDate || null,
        end_date: endDate || null,
        description: description.trim() || null,
        points_win: 3,
        points_draw: 1,
        points_loss: 0,
      });
    setSaving(false);
    if (saveError) toast.error("Não foi possível criar o torneio.");
    else {
      toast.success("Torneio criado com sucesso.");
      setName("");
      setSeasonId("");
      setStartDate("");
      setEndDate("");
      setDescription("");
      await load();
    }
  }

  async function editTournament(tournament: Tournament) {
    const nextName = window.prompt("Nome do torneio", tournament.name)?.trim();
    if (!nextName || nextName === tournament.name) return;
    const { error: updateError } = await supabase.from("tournaments").update({ name: nextName }).eq("id", tournament.id);
    if (updateError) toast.error("Não foi possível editar o torneio.");
    else { toast.success("Torneio atualizado."); await load(); }
  }

  return (
    <AppLayout title="Torneios" subtitle="Competições e destaques oficiais do Resenha FC.">
      {isAdmin ? (
        <SectionCard title="Novo torneio" icon={Plus} className="mb-5">
          <form onSubmit={createTournament} className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-navy">
              Nome
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Copa Resenha FC"
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-navy">
              Temporada
              <Select value={seasonId} onValueChange={setSeasonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {seasons.map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      {season.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-navy">
              Data inicial
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-navy">
              Data final
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-navy sm:col-span-2">
              Descrição
              <Input value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <Button disabled={saving || !seasonId}>
              {saving ? "Salvando..." : "Criar torneio"}
            </Button>
          </form>
        </SectionCard>
      ) : null}
      {loading ? (
        <LoadingState label="Carregando torneios..." />
      ) : error ? (
        <ErrorState title="Não foi possível carregar os torneios." onRetry={() => void load()} />
      ) : tournaments.length === 0 ? (
        <EmptyState title="Nenhum torneio encontrado." />
      ) : (
        <div className="grid gap-3">
          {tournaments.map((tournament) => (
            <article key={tournament.id} className="card-surface flex items-center gap-4 p-4">
              <Link to="/app/torneios/$id" params={{ id: tournament.id }} className="flex min-w-0 flex-1 items-center gap-4 transition-transform hover:-translate-y-0.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-navy">
                <Trophy className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold text-navy">{tournament.name}</h2>
                <p className="text-meta">
                  {seasons.find((season) => season.id === tournament.season_id)?.name ??
                    "Temporada"}
                </p>
              </div>
              <span className="text-xs font-bold uppercase text-orange">{tournament.status}</span>
              </Link>
              {isAdmin ? <Button size="sm" variant="outline" onClick={() => void editTournament(tournament)}>Editar</Button> : null}
            </article>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
