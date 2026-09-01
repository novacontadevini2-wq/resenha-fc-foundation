import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  head: () => ({
    meta: [
      { title: "Torneios | Resenha FC" },
      {
        name: "description",
        content: "Competições, classificação e destaques oficiais do Resenha FC.",
      },
      { property: "og:title", content: "Torneios | Resenha FC" },
      {
        property: "og:description",
        content: "Competições, classificação e destaques oficiais do Resenha FC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TournamentsPage,
});

const STATUS_LABEL: Record<Tournament["status"], string> = {
  planned: "Planejado",
  active: "Em andamento",
  finished: "Finalizado",
  cancelled: "Cancelado",
};

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
  const [statusFilter, setStatusFilter] = useState<"all" | Tournament["status"]>("all");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [editing, setEditing] = useState<Tournament | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    season_id: "",
    start_date: "",
    end_date: "",
    description: "",
    points_win: "3",
    points_draw: "1",
    points_loss: "0",
  });

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
      setError(false);
      setTournaments((data ?? []) as Tournament[]);
      setSeasons((seasonData ?? []) as Season[]);
    }
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);

  const visibleTournaments = useMemo(
    () =>
      tournaments.filter(
        (tournament) =>
          (statusFilter === "all" || tournament.status === statusFilter) &&
          (seasonFilter === "all" || tournament.season_id === seasonFilter),
      ),
    [tournaments, statusFilter, seasonFilter],
  );

  async function createTournament(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !seasonId || (endDate && startDate && endDate < startDate)) {
      toast.error("Confira nome, temporada e datas do torneio.");
      return;
    }
    setSaving(true);
    const { error: saveError } = await supabase.from("tournaments").insert({
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
    if (saveError) toast.error(saveError.message);
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

  function openEdit(tournament: Tournament) {
    setEditing(tournament);
    setEditForm({
      name: tournament.name,
      season_id: tournament.season_id,
      start_date: tournament.start_date ?? "",
      end_date: tournament.end_date ?? "",
      description: tournament.description ?? "",
      points_win: String(tournament.points_win),
      points_draw: String(tournament.points_draw),
      points_loss: String(tournament.points_loss),
    });
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    if (!editForm.name.trim() || !editForm.season_id) {
      toast.error("Nome e temporada são obrigatórios.");
      return;
    }
    if (editForm.start_date && editForm.end_date && editForm.end_date < editForm.start_date) {
      toast.error("A data final deve ser posterior à inicial.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase
      .from("tournaments")
      .update({
        name: editForm.name.trim(),
        season_id: editForm.season_id,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        description: editForm.description.trim() || null,
        points_win: Number(editForm.points_win) || 0,
        points_draw: Number(editForm.points_draw) || 0,
        points_loss: Number(editForm.points_loss) || 0,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (updateError) toast.error(updateError.message);
    else {
      toast.success("Torneio atualizado.");
      setEditing(null);
      await load();
    }
  }

  async function removeTournament(tournament: Tournament) {
    if (!window.confirm(`Excluir o torneio "${tournament.name}"?`)) return;
    const { error: deleteError } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", tournament.id);
    if (deleteError) toast.error(deleteError.message);
    else {
      toast.success("Torneio excluído.");
      await load();
    }
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

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as Tournament["status"][]).map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABEL[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={seasonFilter} onValueChange={setSeasonFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Temporada" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as temporadas</SelectItem>
            {seasons.map((season) => (
              <SelectItem key={season.id} value={season.id}>
                {season.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <LoadingState label="Carregando torneios..." />
      ) : error ? (
        <ErrorState title="Não foi possível carregar os torneios." onRetry={() => void load()} />
      ) : visibleTournaments.length === 0 ? (
        <EmptyState title="Nenhum torneio encontrado." />
      ) : (
        <div className="grid gap-3">
          {visibleTournaments.map((tournament) => (
            <article key={tournament.id} className="card-surface flex items-center gap-4 p-4">
              <Link
                to="/app/torneios/$id"
                params={{ id: tournament.id }}
                className="flex min-w-0 flex-1 items-center gap-4 transition-transform hover:-translate-y-0.5"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-navy">
                  <Trophy className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-bold text-navy">{tournament.name}</h2>
                  <p className="text-meta">
                    {seasons.find((season) => season.id === tournament.season_id)?.name ??
                      "Temporada"}
                    {tournament.start_date ? ` · desde ${formatDate(tournament.start_date)}` : ""}
                  </p>
                </div>
                <span className="text-xs font-bold uppercase text-orange">
                  {STATUS_LABEL[tournament.status]}
                </span>
              </Link>
              {isAdmin ? (
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Editar torneio"
                    onClick={() => openEdit(tournament)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir torneio"
                    onClick={() => void removeTournament(tournament)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (open ? null : setEditing(null))}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar torneio</DialogTitle>
            <DialogDescription>Atualize os dados e a pontuação da competição.</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEdit} className="grid gap-3">
            <label className="grid gap-1 text-sm font-medium text-navy">
              Nome
              <Input
                value={editForm.name}
                onChange={(event) => setEditForm((form) => ({ ...form, name: event.target.value }))}
                required
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-navy">
              Temporada
              <Select
                value={editForm.season_id}
                onValueChange={(value) => setEditForm((form) => ({ ...form, season_id: value }))}
              >
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
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-navy">
                Data inicial
                <Input
                  type="date"
                  value={editForm.start_date}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, start_date: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-navy">
                Data final
                <Input
                  type="date"
                  value={editForm.end_date}
                  min={editForm.start_date}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, end_date: event.target.value }))
                  }
                />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-medium text-navy">
              Descrição
              <Input
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((form) => ({ ...form, description: event.target.value }))
                }
              />
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="grid gap-1 text-sm font-medium text-navy">
                Vitória
                <Input
                  type="number"
                  min={0}
                  value={editForm.points_win}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, points_win: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-navy">
                Empate
                <Input
                  type="number"
                  min={0}
                  value={editForm.points_draw}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, points_draw: event.target.value }))
                  }
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-navy">
                Derrota
                <Input
                  type="number"
                  min={0}
                  value={editForm.points_loss}
                  onChange={(event) =>
                    setEditForm((form) => ({ ...form, points_loss: event.target.value }))
                  }
                />
              </label>
            </div>
            <Button disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}
