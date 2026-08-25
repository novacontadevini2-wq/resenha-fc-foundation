export type AppRole = "admin" | "player";

export type PlayerStatus = "active" | "inactive" | "suspended";
export type SeasonStatus = "planned" | "active" | "finished" | "archived";
export type RoundStatus = "scheduled" | "open" | "in_progress" | "finished" | "cancelled";
export type ParticipationStatus = "pending" | "confirmed" | "absent";

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  status: SeasonStatus;
  created_at: string;
  updated_at: string;
}

export interface Round {
  id: string;
  season_id: string | null;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  location_address: string | null;
  status: RoundStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  user_id: string | null;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  shirt_number: number | null;
  status: PlayerStatus;
  overall_rating: number;
  created_at: string;
  updated_at: string;
}

export interface PlayerPositionRef {
  code: string;
  name: string;
  is_primary: boolean;
}
