import { Link } from "@tanstack/react-router";
import type { Player } from "@/types";

const overallMap: Record<number, number> = { 1: 50, 2: 65, 3: 75, 4: 85, 5: 93 };

function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""); }

export function PlayerCard({
  player,
  positions = [],
  interactive = true,
  onClick,
}: {
  player: Player;
  positions?: string[];
  interactive?: boolean;
  onClick?: () => void;
}) {
  const content = <>
    <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-white/20 bg-navy shadow-xl">
      {player.photo_url ? <img src={player.photo_url} alt="" className="absolute inset-0 size-full object-cover" /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_center,_#244b72,_#071b33_70%)] text-white/70"><span className="font-display text-5xl font-bold">{initials(player.nickname || player.name) || "RF"}</span><span className="text-[10px] font-bold uppercase tracking-[0.18em]">Foto do jogador</span></div>}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,18,35,.28)_0%,rgba(4,18,35,.06)_38%,rgba(4,18,35,.9)_100%)]" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3 text-white"><div><strong className="block font-display text-4xl leading-none">{overallMap[Math.round(player.overall_rating)] ?? overallMap[1]}</strong><span className="mt-1 block text-xs font-bold tracking-[0.16em] text-orange">{positions[0] ?? "RF"}</span></div><img src="/logotipo%20resenha%20fc.png" alt="Resenha FC" className="size-12 object-contain drop-shadow-lg" /></div>
      <div className="absolute inset-x-0 bottom-0 p-3 text-center text-white"><p className="font-display text-sm font-bold tracking-[0.2em] text-orange">RESENHA FC</p><div className="mx-auto mt-2 h-1 w-12 rounded-full bg-orange" /></div>
    </div>
    <div className="mt-2 flex items-center justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-display text-lg font-bold text-navy">{player.name}</h3>{player.nickname ? <p className="text-meta truncate">{player.nickname}</p> : null}</div>{player.shirt_number != null ? <span className="shrink-0 rounded-md bg-navy px-2 py-1 text-xs font-bold text-navy-foreground">#{player.shirt_number}</span> : null}</div>
    {player.status !== "active" ? <p className="mt-1 text-xs font-semibold uppercase text-muted-foreground">{player.status === "suspended" ? "Suspenso" : "Inativo"}</p> : null}
  </>;
  if (onClick) {
    return <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick(); } }} className="block cursor-pointer transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange">{content}</div>;
  }
  return interactive ? <Link to="/app/jogadores/$id" params={{ id: player.id }} className="block transition-transform hover:-translate-y-1">{content}</Link> : <div>{content}</div>;
}
