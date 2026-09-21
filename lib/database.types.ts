export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      auctioneers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auctioneers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          round: number
          team_id: string
          tournament_id: string
          tournament_player_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          round?: number
          team_id: string
          tournament_id: string
          tournament_player_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          round?: number
          team_id?: string
          tournament_id?: string
          tournament_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_player_same_tournament_fkey"
            columns: ["tournament_id", "tournament_player_id"]
            isOneToOne: false
            referencedRelation: "tournament_players"
            referencedColumns: ["tournament_id", "id"]
          },
          {
            foreignKeyName: "bids_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_team_same_tournament_fkey"
            columns: ["tournament_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["tournament_id", "id"]
          },
          {
            foreignKeyName: "bids_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_tournament_player_id_fkey"
            columns: ["tournament_player_id"]
            isOneToOne: false
            referencedRelation: "tournament_players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_interests: {
        Row: {
          bid_preference: number | null
          created_at: string | null
          id: string
          player_id: string
          status: string | null
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          bid_preference?: number | null
          created_at?: string | null
          id?: string
          player_id: string
          status?: string | null
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          bid_preference?: number | null
          created_at?: string | null
          id?: string
          player_id?: string
          status?: string | null
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_interests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_interests_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      player_sales: {
        Row: {
          final_price: number | null
          id: string
          sold_at: string | null
          status: string
          team_id: string | null
          tournament_id: string
          tournament_player_id: string
        }
        Insert: {
          final_price?: number | null
          id?: string
          sold_at?: string | null
          status: string
          team_id?: string | null
          tournament_id: string
          tournament_player_id: string
        }
        Update: {
          final_price?: number | null
          id?: string
          sold_at?: string | null
          status?: string
          team_id?: string | null
          tournament_id?: string
          tournament_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_sales_player_same_tournament_fkey"
            columns: ["tournament_id", "tournament_player_id"]
            isOneToOne: false
            referencedRelation: "tournament_players"
            referencedColumns: ["tournament_id", "id"]
          },
          {
            foreignKeyName: "player_sales_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_sales_team_same_tournament_fkey"
            columns: ["tournament_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["tournament_id", "id"]
          },
          {
            foreignKeyName: "player_sales_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_sales_tournament_player_id_fkey"
            columns: ["tournament_player_id"]
            isOneToOne: true
            referencedRelation: "tournament_players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          base_points: number | null
          batting_average: number | null
          batting_hand: string
          bowling_average: number | null
          bowling_hand: string
          created_at: string | null
          id: string
          matches_played: number | null
          name: string
          phone: string | null
          profile_image_url: string | null
          rating: number | null
          role: string
          runs_scored: number | null
          user_id: string
          wickets_taken: number | null
        }
        Insert: {
          base_points?: number | null
          batting_average?: number | null
          batting_hand: string
          bowling_average?: number | null
          bowling_hand: string
          created_at?: string | null
          id?: string
          matches_played?: number | null
          name: string
          phone?: string | null
          profile_image_url?: string | null
          rating?: number | null
          role: string
          runs_scored?: number | null
          user_id: string
          wickets_taken?: number | null
        }
        Update: {
          base_points?: number | null
          batting_average?: number | null
          batting_hand?: string
          bowling_average?: number | null
          bowling_hand?: string
          created_at?: string | null
          id?: string
          matches_played?: number | null
          name?: string
          phone?: string | null
          profile_image_url?: string | null
          rating?: number | null
          role?: string
          runs_scored?: number | null
          user_id?: string
          wickets_taken?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_contacts: {
        Row: {
          phone: string | null
          profile_kind: string
          user_id: string
        }
        Insert: {
          phone?: string | null
          profile_kind: string
          user_id: string
        }
        Update: {
          phone?: string | null
          profile_kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          budget: number
          color: string
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          short_name: string
          spent: number | null
          status: string | null
          tournament_id: string
        }
        Insert: {
          budget: number
          color: string
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          short_name: string
          spent?: number | null
          status?: string | null
          tournament_id: string
        }
        Update: {
          budget?: number
          color?: string
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          short_name?: string
          spent?: number | null
          status?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_players: {
        Row: {
          auction_round: number
          base_price: number
          created_at: string | null
          id: string
          order_index: number | null
          player_id: string
          status: string | null
          tournament_id: string
        }
        Insert: {
          auction_round?: number
          base_price: number
          created_at?: string | null
          id?: string
          order_index?: number | null
          player_id: string
          status?: string | null
          tournament_id: string
        }
        Update: {
          auction_round?: number
          base_price?: number
          created_at?: string | null
          id?: string
          order_index?: number | null
          player_id?: string
          status?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          auction_date: string | null
          auction_time: string | null
          auctioneer_id: string
          budget_per_team: number
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          min_players_per_team: number
          num_players_per_team: number
          num_teams: number
          player_list_type: string | null
          published_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          auction_date?: string | null
          auction_time?: string | null
          auctioneer_id: string
          budget_per_team: number
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          min_players_per_team: number
          num_players_per_team: number
          num_teams: number
          player_list_type?: string | null
          published_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          auction_date?: string | null
          auction_time?: string | null
          auctioneer_id?: string
          budget_per_team?: number
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          min_players_per_team?: number
          num_players_per_team?: number
          num_teams?: number
          player_list_type?: string | null
          published_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_auctioneer_id_fkey"
            columns: ["auctioneer_id"]
            isOneToOne: false
            referencedRelation: "auctioneers"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_player: {
        Args: { p_tournament_id: string; p_tournament_player_id: string }
        Returns: {
          auction_round: number
          base_price: number
          created_at: string | null
          id: string
          order_index: number | null
          player_id: string
          status: string | null
          tournament_id: string
        }
        SetofOptions: {
          from: "*"
          to: "tournament_players"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_auction: {
        Args: { p_tournament_id: string }
        Returns: {
          auction_date: string | null
          auction_time: string | null
          auctioneer_id: string
          budget_per_team: number
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          min_players_per_team: number
          num_players_per_team: number
          num_teams: number
          player_list_type: string | null
          published_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournaments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_user_role: { Args: never; Returns: string }
      mark_player_sold: {
        Args: {
          p_final_price: number
          p_team_id: string
          p_tournament_id: string
          p_tournament_player_id: string
        }
        Returns: {
          final_price: number | null
          id: string
          sold_at: string | null
          status: string
          team_id: string | null
          tournament_id: string
          tournament_player_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_player_unsold: {
        Args: { p_tournament_id: string; p_tournament_player_id: string }
        Returns: {
          final_price: number | null
          id: string
          sold_at: string | null
          status: string
          team_id: string | null
          tournament_id: string
          tournament_player_id: string
        }
        SetofOptions: {
          from: "*"
          to: "player_sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      place_bid: {
        Args: {
          p_amount: number
          p_team_id: string
          p_tournament_id: string
          p_tournament_player_id: string
        }
        Returns: {
          amount: number
          created_at: string | null
          id: string
          round: number
          team_id: string
          tournament_id: string
          tournament_player_id: string
        }
        SetofOptions: {
          from: "*"
          to: "bids"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      re_auction_unsold: {
        Args: { p_tournament_id: string }
        Returns: {
          auction_round: number
          base_price: number
          created_at: string | null
          id: string
          order_index: number | null
          player_id: string
          status: string | null
          tournament_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tournament_players"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      start_auction: {
        Args: { p_tournament_id: string }
        Returns: {
          auction_date: string | null
          auction_time: string | null
          auctioneer_id: string
          budget_per_team: number
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          min_players_per_team: number
          num_players_per_team: number
          num_teams: number
          player_list_type: string | null
          published_at: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tournaments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

