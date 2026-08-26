import { PlayerCard } from "@/components/players/PlayerCard";
import type { Player } from "@/types";

export interface DrawPlayerSnapshot { draw_id: string; team_id: string; player_id: string; player_name_snapshot: string; rating_snapshot: number; position_code_snapshot: string | null; photo_url_snapshot: string | null; }

export function TeamCard({ teamNumber, totalRating, players }: { teamNumber: number; totalRating: number; players: DrawPlayerSnapshot[] }) {
  return <article className="card-surface p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-display text-lg font-bold text-navy">Time {teamNumber}</h3><span className="text-sm font-semibold text-orange">Força: {totalRating.toFixed(1)}</span></div><div className="grid grid-cols-2 gap-3">{players.map((snapshot) => <div key={snapshot.player_id}><PlayerCard player={{ id: snapshot.player_id, user_id: null, name: snapshot.player_name_snapshot, nickname: null, photo_url: snapshot.photo_url_snapshot, shirt_number: null, status: "active", overall_rating: snapshot.rating_snapshot, created_at: "", updated_at: "" } as Player} positions={snapshot.position_code_snapshot ? [snapshot.position_code_snapshot] : []} interactive={false} /></div>)}</div></article>;
}