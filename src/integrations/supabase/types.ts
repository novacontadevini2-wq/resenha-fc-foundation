export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          published_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          published_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          published_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      club_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      draw_team_players: {
        Row: {
          draw_id: string
          id: string
          photo_url_snapshot: string | null
          player_id: string
          player_name_snapshot: string
          position_code_snapshot: string | null
          position_name_snapshot: string | null
          rating_snapshot: number
          team_id: string
        }
        Insert: {
          draw_id: string
          id?: string
          photo_url_snapshot?: string | null
          player_id: string
          player_name_snapshot: string
          position_code_snapshot?: string | null
          position_name_snapshot?: string | null
          rating_snapshot: number
          team_id: string
        }
        Update: {
          draw_id?: string
          id?: string
          photo_url_snapshot?: string | null
          player_id?: string
          player_name_snapshot?: string
          position_code_snapshot?: string | null
          position_name_snapshot?: string | null
          rating_snapshot?: number
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "draw_team_players_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_team_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "draw_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_teams: {
        Row: {
          draw_id: string
          id: string
          team_number: number
          total_rating: number
        }
        Insert: {
          draw_id: string
          id?: string
          team_number: number
          total_rating?: number
        }
        Update: {
          draw_id?: string
          id?: string
          team_number?: number
          total_rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "draw_teams_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
        ]
      }
      draws: {
        Row: {
          algorithm_version: string
          balance_score: number
          confirmed_at: string | null
          created_at: string
          created_by: string
          id: string
          players_per_team: number
          round_id: string
          status: string
          teams_count: number
        }
        Insert: {
          algorithm_version?: string
          balance_score?: number
          confirmed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          players_per_team: number
          round_id: string
          status?: string
          teams_count: number
        }
        Update: {
          algorithm_version?: string
          balance_score?: number
          confirmed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          players_per_team?: number
          round_id?: string
          status?: string
          teams_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "draws_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      goalkeeper_stats: {
        Row: {
          created_at: string
          goals_conceded: number
          id: string
          match_id: string
          player_id: string
          saves: number | null
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goals_conceded?: number
          id?: string
          match_id: string
          player_id: string
          saves?: number | null
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goals_conceded?: number
          id?: string
          match_id?: string
          player_id?: string
          saves?: number | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goalkeeper_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goalkeeper_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goalkeeper_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "draw_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_assists: {
        Row: {
          created_at: string
          created_by: string
          goal_id: string
          id: string
          match_id: string
          player_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          goal_id: string
          id?: string
          match_id: string
          player_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          goal_id?: string
          id?: string
          match_id?: string
          player_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_assists_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: true
            referencedRelation: "match_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_assists_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_assists_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_assists_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "draw_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_goals: {
        Row: {
          created_at: string
          id: string
          match_id: string
          minute: number | null
          player_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          minute?: number | null
          player_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          minute?: number | null
          player_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_goals_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_goals_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_goals_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "draw_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          draw_id: string
          finished_at: string | null
          id: string
          notes: string | null
          round_id: string
          scheduled_at: string | null
          score_a: number
          score_b: number
          started_at: string | null
          status: string
          team_a_id: string
          team_b_id: string
          tournament_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          draw_id: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          round_id: string
          scheduled_at?: string | null
          score_a?: number
          score_b?: number
          started_at?: string | null
          status?: string
          team_a_id: string
          team_b_id: string
          tournament_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          draw_id?: string
          finished_at?: string | null
          id?: string
          notes?: string | null
          round_id?: string
          scheduled_at?: string | null
          score_a?: number
          score_b?: number
          started_at?: string | null
          status?: string
          team_a_id?: string
          team_b_id?: string
          tournament_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_draw_id_fkey"
            columns: ["draw_id"]
            isOneToOne: false
            referencedRelation: "draws"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "draw_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "draw_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          event_key: string
          id: string
          message: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          message: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          message?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      player_positions: {
        Row: {
          id: string
          is_primary: boolean
          player_id: string
          position_id: string
        }
        Insert: {
          id?: string
          is_primary?: boolean
          player_id: string
          position_id: string
        }
        Update: {
          id?: string
          is_primary?: boolean
          player_id?: string
          position_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_positions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_positions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          id: string
          name: string
          nickname: string | null
          overall_rating: number
          photo_url: string | null
          shirt_number: number | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          nickname?: string | null
          overall_rating?: number
          photo_url?: string | null
          shirt_number?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          nickname?: string | null
          overall_rating?: number
          photo_url?: string | null
          shirt_number?: number | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      positions: {
        Row: {
          active: boolean
          code: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          code: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          nickname: string | null
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          nickname?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          nickname?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      round_players: {
        Row: {
          created_at: string
          id: string
          participation_status: string
          player_id: string
          round_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          participation_status?: string
          player_id: string
          round_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          participation_status?: string
          player_id?: string
          round_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "round_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_players_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          location_address: string | null
          location_name: string | null
          notes: string | null
          scheduled_date: string
          season_id: string | null
          start_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          location_address?: string | null
          location_name?: string | null
          notes?: string | null
          scheduled_date: string
          season_id?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          location_address?: string | null
          location_name?: string | null
          notes?: string | null
          scheduled_date?: string
          season_id?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      tournament_teams: {
        Row: {
          created_at: string
          id: string
          team_id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "draw_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          points_draw: number
          points_loss: number
          points_win: number
          season_id: string
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          points_draw?: number
          points_loss?: number
          points_win?: number
          season_id: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          points_draw?: number
          points_loss?: number
          points_win?: number
          season_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_tournament_team: {
        Args: { p_team_id: string; p_tournament_id: string }
        Returns: string
      }
      attach_match_to_tournament: {
        Args: { p_match_id: string; p_tournament_id: string }
        Returns: undefined
      }
      cancel_match: { Args: { p_match_id: string }; Returns: undefined }
      confirm_draw: { Args: { p_draw_id: string }; Returns: undefined }
      create_match: {
        Args: {
          p_draw_id: string
          p_notes?: string
          p_round_id: string
          p_scheduled_at?: string
          p_team_a_id: string
          p_team_b_id: string
        }
        Returns: string
      }
      create_notification: {
        Args: {
          p_event_key: string
          p_message: string
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_player: {
        Args: {
          p_name: string
          p_nickname?: string
          p_overall_rating: number
          p_photo_url?: string
          p_position_id: string
          p_shirt_number?: number
          p_status?: string
        }
        Returns: string
      }
      delete_match: { Args: { p_match_id: string }; Returns: undefined }
      delete_match_goal: { Args: { p_goal_id: string }; Returns: undefined }
      ensure_presence_reminder: {
        Args: { p_round_id: string }
        Returns: string
      }
      finish_match: { Args: { p_match_id: string }; Returns: undefined }
      get_admin_settings: {
        Args: never
        Returns: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "club_settings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_round_participants: {
        Args: {
          p_entity_id?: string
          p_entity_type?: string
          p_event_key: string
          p_message: string
          p_round_id: string
          p_title: string
          p_type: string
        }
        Returns: number
      }
      perform_draw: {
        Args: {
          p_player_ids: string[]
          p_players_per_team: number
          p_round_id: string
          p_teams_count: number
        }
        Returns: string
      }
      publish_announcement: {
        Args: { p_announcement_id: string }
        Returns: undefined
      }
      register_match_goal: {
        Args: {
          p_match_id: string
          p_minute?: number
          p_player_id: string
          p_team_id: string
        }
        Returns: string
      }
      register_match_goal_with_assist: {
        Args: {
          p_assist_player_id?: string
          p_match_id: string
          p_minute?: number
          p_player_id: string
          p_team_id: string
        }
        Returns: string
      }
      set_match_score: {
        Args: { p_match_id: string; p_score_a: number; p_score_b: number }
        Returns: undefined
      }
      set_tournament_status: {
        Args: { p_status: string; p_tournament_id: string }
        Returns: undefined
      }
      start_match: { Args: { p_match_id: string }; Returns: undefined }
      unpublish_announcement: {
        Args: { p_announcement_id: string }
        Returns: undefined
      }
      update_club_settings: {
        Args: { p_key: string; p_value: Json }
        Returns: undefined
      }
      update_match_details: {
        Args: {
          p_match_id: string
          p_notes?: string
          p_scheduled_at?: string
          p_team_a_id: string
          p_team_b_id: string
        }
        Returns: undefined
      }
      update_match_goal: {
        Args: {
          p_goal_id: string
          p_minute?: number
          p_player_id: string
          p_team_id: string
        }
        Returns: undefined
      }
      update_match_goal_with_assist: {
        Args: {
          p_assist_player_id?: string
          p_goal_id: string
          p_minute?: number
          p_player_id: string
          p_team_id: string
        }
        Returns: undefined
      }
      upsert_goalkeeper_stats: {
        Args: {
          p_goals_conceded: number
          p_match_id: string
          p_player_id: string
          p_saves?: number
          p_team_id: string
        }
        Returns: string
      }
      validate_match_teams: {
        Args: {
          p_draw_id: string
          p_round_id: string
          p_team_a_id: string
          p_team_b_id: string
        }
        Returns: undefined
      }
      write_audit_log: {
        Args: {
          p_action: string
          p_after: Json
          p_before: Json
          p_entity_id: string
          p_entity_type: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "player"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "player"],
    },
  },
} as const
