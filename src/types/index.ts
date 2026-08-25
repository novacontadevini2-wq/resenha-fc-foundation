export type AppRole = "admin" | "player";

export type PlayerStatus = "active" | "inactive" | "suspended";

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
