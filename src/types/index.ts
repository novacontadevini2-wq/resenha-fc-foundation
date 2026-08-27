export type AppRole = "admin" | "player";

export type PlayerStatus = "active" | "inactive" | "suspended";
export type SeasonStatus = "planned" | "active" | "finished" | "archived";
export type RoundStatus = "scheduled" | "open" | "in_progress" | "finished" | "cancelled";
export type ParticipationStatus = "pending" | "confirmed" | "absent";
export type MatchStatus = "scheduled" | "in_progress" | "finished" | "cancelled";

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

export interface Match {
  id: string;
  round_id: string;
  draw_id: string;
  tournament_id: string | null;
  team_a_id: string;
  team_b_id: string;
  scheduled_at: string | null;
  status: MatchStatus;
  score_a: number;
  score_b: number;
  notes: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Draw {
  id: string;
  round_id: string;
  teams_count: number;
  players_per_team: number;
  status: string;
  balance_score: number;
  algorithm_version: string;
  created_at: string;
}

export interface MatchTeam {
  id: string;
  draw_id: string;
  team_number: number;
  total_rating: number;
}

export interface MatchGoal {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  minute: number | null;
  created_at: string;
  updated_at: string;
}

export interface MatchAssist {
  id: string;
  goal_id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MatchGoalkeeperStat {
  id: string;
  match_id: string;
  player_id: string;
  team_id: string;
  goals_conceded: number;
  saves: number | null;
  created_at: string;
  updated_at: string;
}

export interface Tournament {
  id: string;
  season_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  points_win: number;
  points_draw: number;
  points_loss: number;
  status: "planned" | "active" | "finished" | "cancelled";
  created_at: string;
  updated_at: string;
}

export type NotificationType = "round" | "presence" | "draw" | "result" | "tournament" | "ranking" | "announcement";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  event_key: string;
  read_at: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  status: "draft" | "published" | "expired";
  published_at: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
