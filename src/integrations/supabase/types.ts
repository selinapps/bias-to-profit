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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bias_state: {
        Row: {
          active: boolean
          bias: 'OOB_LONG' | 'OOB_SHORT' | 'MR_LONG' | 'MR_SHORT' | 'NONE'
          confidence: 'LOW' | 'MEDIUM' | 'HIGH' | null
          day_key: string
          id: string
          market_state: 'OUT_OF_BALANCE' | 'IN_BALANCE' | null
          selected_at: string
          selected_by: string | null
          tags: Json | null
        }
        Insert: {
          active?: boolean
          bias: 'OOB_LONG' | 'OOB_SHORT' | 'MR_LONG' | 'MR_SHORT' | 'NONE'
          confidence?: 'LOW' | 'MEDIUM' | 'HIGH' | null
          day_key: string
          id?: string
          market_state?: 'OUT_OF_BALANCE' | 'IN_BALANCE' | null
          selected_at?: string
          selected_by?: string | null
          tags?: Json | null
        }
        Update: {
          active?: boolean
          bias?: 'OOB_LONG' | 'OOB_SHORT' | 'MR_LONG' | 'MR_SHORT' | 'NONE'
          confidence?: 'LOW' | 'MEDIUM' | 'HIGH' | null
          day_key?: string
          id?: string
          market_state?: 'OUT_OF_BALANCE' | 'IN_BALANCE' | null
          selected_at?: string
          selected_by?: string | null
          tags?: Json | null
        }
        Relationships: []
      }
      daily_stats: {
        Row: {
          avg_r: number | null
          best_hour: number | null
          best_trade_r: number | null
          consecutive_losses: number | null
          created_at: string
          date: string
          day_disabled: boolean | null
          house_money_active: boolean | null
          id: string
          losing_trades: number | null
          mean_reversion_trades: number | null
          mean_reversion_win_rate: number | null
          total_pnl: number | null
          total_r: number | null
          total_trades: number | null
          trend_trades: number | null
          trend_win_rate: number | null
          updated_at: string
          user_id: string
          win_rate: number | null
          winning_trades: number | null
          worst_hour: number | null
          worst_trade_r: number | null
        }
        Insert: {
          avg_r?: number | null
          best_hour?: number | null
          best_trade_r?: number | null
          consecutive_losses?: number | null
          created_at?: string
          date: string
          day_disabled?: boolean | null
          house_money_active?: boolean | null
          id?: string
          losing_trades?: number | null
          mean_reversion_trades?: number | null
          mean_reversion_win_rate?: number | null
          total_pnl?: number | null
          total_r?: number | null
          total_trades?: number | null
          trend_trades?: number | null
          trend_win_rate?: number | null
          updated_at?: string
          user_id: string
          win_rate?: number | null
          winning_trades?: number | null
          worst_hour?: number | null
          worst_trade_r?: number | null
        }
        Update: {
          avg_r?: number | null
          best_hour?: number | null
          best_trade_r?: number | null
          consecutive_losses?: number | null
          created_at?: string
          date?: string
          day_disabled?: boolean | null
          house_money_active?: boolean | null
          id?: string
          losing_trades?: number | null
          mean_reversion_trades?: number | null
          mean_reversion_win_rate?: number | null
          total_pnl?: number | null
          total_r?: number | null
          total_trades?: number | null
          trend_trades?: number | null
          trend_win_rate?: number | null
          updated_at?: string
          user_id?: string
          win_rate?: number | null
          winning_trades?: number | null
          worst_hour?: number | null
          worst_trade_r?: number | null
        }
        Relationships: []
      }
      hypotheses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          risk_settings: Json | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          risk_settings?: Json | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          risk_settings?: Json | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          aggression: string[] | null
          bias_snapshot: Json
          asset: string
          checklist: Json
          checklist_complete: boolean
          created_at: string
          direction: string
          duration_minutes: number | null
          emotions: Json | null
          entry_price: number
          entry_time: string
          exit_price: number | null
          exit_time: string | null
          externals: string[] | null
          hypothesis_id: string | null
          id: string
          is_experimental: boolean | null
          locations: string[] | null
          mistake_tags: string[] | null
          model: string
          notes: string | null
          override_reason: string | null
          pnl: number | null
          r_multiple: number | null
          risk_amount: number
          risk_tier: string
          session: string | null
          scenarios: string[] | null
          screenshot_url: string | null
          status: string | null
          stop_loss: number
          trading_session: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aggression?: string[] | null
          asset: string
          bias_snapshot: Json
          checklist: Json
          checklist_complete?: boolean
          created_at?: string
          direction: string
          duration_minutes?: number | null
          emotions?: Json | null
          entry_price: number
          entry_time?: string
          exit_price?: number | null
          exit_time?: string | null
          externals?: string[] | null
          hypothesis_id?: string | null
          id?: string
          is_experimental?: boolean | null
          locations?: string[] | null
          mistake_tags?: string[] | null
          model: string
          notes?: string | null
          override_reason?: string | null
          pnl?: number | null
          r_multiple?: number | null
          risk_amount: number
          risk_tier: string
          session?: string | null
          scenarios?: string[] | null
          screenshot_url?: string | null
          status?: string | null
          stop_loss: number
          trading_session?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aggression?: string[] | null
          asset?: string
          bias_snapshot?: Json
          checklist?: Json
          checklist_complete?: boolean
          created_at?: string
          direction?: string
          duration_minutes?: number | null
          emotions?: Json | null
          entry_price?: number
          entry_time?: string
          exit_price?: number | null
          exit_time?: string | null
          externals?: string[] | null
          hypothesis_id?: string | null
          id?: string
          is_experimental?: boolean | null
          locations?: string[] | null
          mistake_tags?: string[] | null
          model?: string
          notes?: string | null
          override_reason?: string | null
          pnl?: number | null
          r_multiple?: number | null
          risk_amount?: number
          risk_tier?: string
          session?: string | null
          scenarios?: string[] | null
          screenshot_url?: string | null
          status?: string | null
          stop_loss?: number
          trading_session?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "hypotheses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          daily_wrap_time: string | null
          edge_reminders: Json | null
          id: string
          last_aggression: string[] | null
          last_locations: string[] | null
          last_model: string | null
          last_risk_tier: string | null
          notifications_enabled: boolean | null
          offline_mode: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_wrap_time?: string | null
          edge_reminders?: Json | null
          id?: string
          last_aggression?: string[] | null
          last_locations?: string[] | null
          last_model?: string | null
          last_risk_tier?: string | null
          notifications_enabled?: boolean | null
          offline_mode?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_wrap_time?: string | null
          edge_reminders?: Json | null
          id?: string
          last_aggression?: string[] | null
          last_locations?: string[] | null
          last_model?: string | null
          last_risk_tier?: string | null
          notifications_enabled?: boolean | null
          offline_mode?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_current_bias: {
        Row: {
          bias: 'OOB_LONG' | 'OOB_SHORT' | 'MR_LONG' | 'MR_SHORT' | 'NONE'
          confidence: 'LOW' | 'MEDIUM' | 'HIGH' | null
          day_key: string
          id: string
          market_state: 'OUT_OF_BALANCE' | 'IN_BALANCE' | null
          selected_at: string
          tags: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      compute_daily_stats: {
        Args: { target_date: string; target_user_id: string }
        Returns: Json
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
    Enums: {},
  },
} as const
