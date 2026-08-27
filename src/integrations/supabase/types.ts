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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      tournaments: {
        Row: { id: string; season_id: string; name: string; start_date: string | null; end_date: string | null; description: string | null; points_win: number; points_draw: number; points_loss: number; status: string; created_at: string; updated_at: string }
        Insert: { id?: string; season_id: string; name: string; start_date?: string | null; end_date?: string | null; description?: string | null; points_win?: number; points_draw?: number; points_loss?: number; status?: string; created_at?: string; updated_at?: string }
        Update: { id?: string; season_id?: string; name?: string; start_date?: string | null; end_date?: string | null; description?: string | null; points_win?: number; points_draw?: number; points_loss?: number; status?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      tournament_teams: {
        Row: { id: string; tournament_id: string; team_id: string; created_at: string }
        Insert: { id?: string; tournament_id: string; team_id: string; created_at?: string }
        Update: { id?: string; tournament_id?: string; team_id?: string; created_at?: string }
        Relationships: []
      }
      match_assists: {
        Row: { id: string; goal_id: string; match_id: string; player_id: string; team_id: string; created_by: string; created_at: string; updated_at: string }
        Insert: { id?: string; goal_id: string; match_id: string; player_id: string; team_id: string; created_by: string; created_at?: string; updated_at?: string }
        Update: { id?: string; goal_id?: string; match_id?: string; player_id?: string; team_id?: string; created_by?: string; created_at?: string; updated_at?: string }
        Relationships: []
      }
      goalkeeper_stats: {
        Row: { id: string; match_id: string; player_id: string; team_id: string; goals_conceded: number; saves: number | null; created_at: string; updated_at: string }
        Insert: { id?: string; match_id: string; player_id: string; team_id: string; goals_conceded?: number; saves?: number | null; created_at?: string; updated_at?: string }
        Update: { id?: string; match_id?: string; player_id?: string; team_id?: string; goals_conceded?: number; saves?: number | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      matches: {
        Row: { id: string; round_id: string; draw_id: string; tournament_id: string | null; team_a_id: string; team_b_id: string; scheduled_at: string | null; status: string; score_a: number; score_b: number; notes: string | null; started_at: string | null; finished_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; round_id: string; draw_id: string; tournament_id?: string | null; team_a_id: string; team_b_id: string; scheduled_at?: string | null; status?: string; score_a?: number; score_b?: number; notes?: string | null; started_at?: string | null; finished_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; round_id?: string; draw_id?: string; tournament_id?: string | null; team_a_id?: string; team_b_id?: string; scheduled_at?: string | null; status?: string; score_a?: number; score_b?: number; notes?: string | null; started_at?: string | null; finished_at?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      match_goals: {
        Row: { id: string; match_id: string; player_id: string; team_id: string; minute: number | null; created_at: string; updated_at: string }
        Insert: { id?: string; match_id: string; player_id: string; team_id: string; minute?: number | null; created_at?: string; updated_at?: string }
        Update: { id?: string; match_id?: string; player_id?: string; team_id?: string; minute?: number | null; created_at?: string; updated_at?: string }
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
      attach_match_to_tournament: { Args: { p_match_id: string; p_tournament_id: string }; Returns: undefined }
      add_tournament_team: { Args: { p_tournament_id: string; p_team_id: string }; Returns: string }
      register_match_goal_with_assist: { Args: { p_match_id: string; p_player_id: string; p_team_id: string; p_minute?: number | null; p_assist_player_id?: string | null }; Returns: string }
      upsert_goalkeeper_stats: { Args: { p_match_id: string; p_player_id: string; p_team_id: string; p_goals_conceded: number; p_saves?: number | null }; Returns: string }
      update_match_goal_with_assist: { Args: { p_goal_id: string; p_player_id: string; p_team_id: string; p_minute?: number | null; p_assist_player_id?: string | null }; Returns: undefined }
      create_match: { Args: { p_round_id: string; p_draw_id: string; p_team_a_id: string; p_team_b_id: string; p_scheduled_at?: string | null; p_notes?: string | null }; Returns: string }
      start_match: { Args: { p_match_id: string }; Returns: undefined }
      set_match_score: { Args: { p_match_id: string; p_score_a: number; p_score_b: number }; Returns: undefined }
      register_match_goal: { Args: { p_match_id: string; p_player_id: string; p_team_id: string; p_minute?: number | null }; Returns: string }
      update_match_goal: { Args: { p_goal_id: string; p_player_id: string; p_team_id: string; p_minute?: number | null }; Returns: undefined }
      delete_match_goal: { Args: { p_goal_id: string }; Returns: undefined }
      finish_match: { Args: { p_match_id: string }; Returns: undefined }
      cancel_match: { Args: { p_match_id: string }; Returns: undefined }
      confirm_draw: { Args: { p_draw_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
