import { CalendarDays, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SectionCard } from "@/components/ui/section-card";
import type { Round } from "@/types";

export function NextRoundCard({ round, confirmedCount = 0 }: { round: Round; confirmedCount?: number }) {
  const date = new Date(`${round.scheduled_date}T12:00:00`);
  return <Link to="/app/rodadas/$id" params={{ id: round.id }}><SectionCard title="Próxima pelada" icon={CalendarDays} className="transition-transform hover:-translate-y-0.5"><div className="flex items-center gap-4"><div className="rounded-lg bg-navy px-3 py-2 text-center text-white"><strong className="block font-display text-2xl leading-none">{date.getDate().toString().padStart(2, "0")}</strong><span className="text-[10px] font-bold uppercase text-orange">{date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div><div><p className="font-semibold text-navy">{date.toLocaleDateString("pt-BR", { weekday: "long" })}</p><p className="text-meta">{round.start_time?.slice(0, 5) ?? "20:00"} às {round.end_time?.slice(0, 5) ?? "22:00"}</p><p className="text-meta mt-1 flex items-center gap-1"><MapPin className="size-3" />{round.location_name}</p><p className="text-xs font-semibold text-orange">{confirmedCount} confirmado{confirmedCount === 1 ? "" : "s"}</p></div></div></SectionCard></Link>;
}
