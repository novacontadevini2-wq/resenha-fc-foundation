import { createFileRoute, redirect } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Player, Round } from "@/types";

export const Route = createFileRoute("/_authenticated/app/admin/presencas")({
  head: () => ({
    meta: [
      { title: "Presenças da rodada | Resenha FC" },
      {
        name: "description",
        content: "Confirme manualmente quem vai jogar a próxima pelada do Resenha FC.",
      },
      { property: "og:title", content: "Presenças da rodada | Resenha FC" },
      {
        property: "og:description",
        content: "Controle de presença dos jogadores do Resenha FC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/app/principal" });
  },
  component: PresencePage,
});

function PresencePage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundId, setRoundId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [presence, setPresence] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadPresence(nextRoundId: string) {
    const { data } = await supabase
      .from("round_players")
      .select("player_id, participation_status")
      .eq("round_id", nextRoundId);
    setPresence(
      Object.fromEntries(
        (data ?? []).map((row) => [row.player_id, row.participation_status ?? "pending"]),
      ),
    );
  }

  async function load() {
    setLoading(true);
    const [roundsResult, playersResult] = await Promise.all([
      supabase
        .from("rounds")
        .select("*")
        .not("status", "in", "(cancelled,finished)")
        .order("scheduled_date")
        .order("start_time"),
      supabase.from("players").select("*").eq("status", "active").order("name"),
    ]);

    if (roundsResult.error || playersResult.error) {
      setError(true);
      setLoading(false);
      return;
    }

    const nextRounds = (roundsResult.data ?? []) as Round[];
    setRounds(nextRounds);
    setPlayers((playersResult.data ?? []) as Player[]);
    const first = nextRounds[0]?.id ?? "";
    setRoundId(first);
    if (first) await loadPresence(first);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(playerId: string, status: "confirmed" | "declined" | "pending") {
    if (!roundId) return;
    setSavingId(playerId);
    const { error: saveError } = await supabase
      .from("round_players")
      .upsert(
        { round_id: roundId, player_id: playerId, participation_status: status },
        { onConflict: "round_id,player_id" },
      );
    setSavingId(null);
    if (saveError) {
      toast.error(saveError.message);
      return;
    }
    setPresence((current) => ({ ...current, [playerId]: status }));
  }

  async function changeRound(value: string) {
    setRoundId(value);
    setPresence({});
    await loadPresence(value);
  }

  const confirmedCount = players.filter((player) => presence[player.id] === "confirmed").length;

  return (
    <AppLayout title="Presenças" subtitle="Confirme manualmente quem vai jogar a rodada.">
      {loading ? (
        <LoadingState label="Carregando presenças..." />
      ) : error ? (
        <ErrorState title="Não foi possível carregar os dados." onRetry={() => void load()} />
      ) : rounds.length === 0 ? (
        <EmptyState title="Nenhuma rodada disponível." />
      ) : (
        <div className="grid gap-5">
          <SectionCard title="Rodada" icon={CheckCircle2}>
            <Select value={roundId} onValueChange={(value) => void changeRound(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma rodada" />
              </SelectTrigger>
              <SelectContent>
                {rounds.map((round) => (
                  <SelectItem key={round.id} value={round.id}>
                    {new Date(`${round.scheduled_date}T12:00:00`).toLocaleDateString("pt-BR")} ·{" "}
                    {round.location_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-meta mt-2">
              {confirmedCount} de {players.length} jogadores confirmados
            </p>
          </SectionCard>

          <section className="card-surface grid gap-2 p-5">
            {players.map((player) => {
              const status = presence[player.id] ?? "pending";
              return (
                <div
                  key={player.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2"
                >
                  <span className="min-w-0 flex-1 text-sm font-semibold text-navy">
                    {player.name}
                    {status === "confirmed" ? (
                      <span className="ml-2 rounded-full bg-orange px-2 py-0.5 text-[11px] font-bold uppercase text-white">
                        Confirmado
                      </span>
                    ) : status === "declined" || status === "absent" ? (
                      <span className="text-muted-foreground ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold uppercase">
                        Não vai
                      </span>
                    ) : null}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={status === "confirmed" ? "default" : "outline"}
                      disabled={savingId === player.id}
                      onClick={() => void setStatus(player.id, "confirmed")}
                    >
                      Vai jogar
                    </Button>
                    <Button
                      size="sm"
                      variant={status === "declined" ? "default" : "outline"}
                      disabled={savingId === player.id}
                      onClick={() => void setStatus(player.id, "declined")}
                    >
                      Não vai
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={savingId === player.id}
                      onClick={() => void setStatus(player.id, "pending")}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </AppLayout>
  );
}
