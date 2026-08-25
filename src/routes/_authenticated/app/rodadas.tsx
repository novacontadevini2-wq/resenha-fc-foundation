import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/states";
import { NextRoundCard } from "@/components/rounds/NextRoundCard";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import type { Round } from "@/types";

export const Route = createFileRoute("/_authenticated/app/rodadas")({ component: RoundsPage, head: () => ({ meta: [{ title: "Rodadas | Resenha FC" }] }) });
function RoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([]); const [counts, setCounts] = useState<Record<string, number>>({}); const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  useEffect(() => { async function load() { const { data, error: roundError } = await supabase.from("rounds").select("*").order("scheduled_date", { ascending: true }); const { data: participants } = await supabase.from("round_players").select("round_id").eq("participation_status", "confirmed"); if (roundError) setError(true); else { setRounds((data ?? []) as Round[]); setCounts((participants ?? []).reduce<Record<string, number>>((result, item) => { result[item.round_id] = (result[item.round_id] ?? 0) + 1; return result; }, {})); } setLoading(false); } void load(); }, []);
  const upcoming = rounds.filter((round) => new Date(`${round.scheduled_date}T23:59:59`) >= new Date() && !["cancelled", "finished"].includes(round.status)); const history = rounds.filter((round) => !upcoming.includes(round));
  return <AppLayout title="Rodadas" subtitle="Acompanhe as peladas do Resenha FC.">{loading ? <LoadingState label="Carregando rodadas..." /> : error ? <ErrorState title="Não foi possível carregar as rodadas." /> : rounds.length === 0 ? <EmptyState title="Nenhuma rodada encontrada." /> : <div className="grid gap-5"><SectionCard title="Próximas rodadas" icon={CalendarDays}>{upcoming.length ? <div className="grid gap-3 sm:grid-cols-2">{upcoming.map((round) => <NextRoundCard key={round.id} round={round} confirmedCount={counts[round.id] ?? 0} />)}</div> : <p className="text-meta">Nenhuma próxima rodada cadastrada.</p>}</SectionCard><SectionCard title="Histórico" icon={CalendarDays}>{history.length ? <div className="grid gap-2">{history.map((round) => <NextRoundCard key={round.id} round={round} confirmedCount={counts[round.id] ?? 0} />)}</div> : <p className="text-meta">Nenhuma rodada anterior.</p>}</SectionCard></div>}</AppLayout>;
}
