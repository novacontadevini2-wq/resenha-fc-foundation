import type { MatchStatus } from "@/types";

const labels: Record<MatchStatus, string> = {
  scheduled: "Agendada",
  in_progress: "Em andamento",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  return <span className="inline-flex rounded-full bg-accent px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-navy">{labels[status]}</span>;
}