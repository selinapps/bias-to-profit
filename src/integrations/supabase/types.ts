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
          active: boolean | null
          bias: string
          confidence: string | null
          created_at: string | null
          day_key: string
          id: string
          market_state: string | null
          selected_at: string | null
          selected_by: string | null
          tags: Json | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          bias: string
          confidence?: string | null
          created_at?: string | null
          day_key: string
          id?: string
          market_state?: string | null
          selected_at?: string | null
          selected_by?: string | null
          tags?: Json | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          bias?: string
          confidence?: string | null
          created_at?: string | null
          day_key?: string
          id?: string
          market_state?: string | null
          selected_at?: string | null
          selected_by?: string | null
          tags?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_session_patterns: {
        Row: {
          asia_behavior: Database["public"]["Enums"]["session_behavior"]
          confidence: number | null
          created_at: string | null
          date: string
          id: string
          inferred_scenario: Database["public"]["Enums"]["session_scenario"]
          london_behavior: Database["public"]["Enums"]["session_behavior"]
          notes: string | null
          ny_behavior: Database["public"]["Enums"]["session_behavior"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asia_behavior?: Database["public"]["Enums"]["session_behavior"]
          confidence?: number | null
          created_at?: string | null
          date: string
          id?: string
          inferred_scenario?: Database["public"]["Enums"]["session_scenario"]
          london_behavior?: Database["public"]["Enums"]["session_behavior"]
          notes?: string | null
          ny_behavior?: Database["public"]["Enums"]["session_behavior"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asia_behavior?: Database["public"]["Enums"]["session_behavior"]
          confidence?: number | null
          created_at?: string | null
          date?: string
          id?: string
          inferred_scenario?: Database["public"]["Enums"]["session_scenario"]
          london_behavior?: Database["public"]["Enums"]["session_behavior"]
          notes?: string | null
          ny_behavior?: Database["public"]["Enums"]["session_behavior"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          risk_settings: Json | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          risk_settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          risk_settings?: Json | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          // Core identifiers
          id: string
          user_id: string
          challenge_id: string | null
          
          // Core trade data (Entry stage)
          asset: string
          direction: string // "buy", "sell", "long", "short"
          entry_time: string | null
          entry_price: number
          stop_loss: number
          target_price: number | null // Planned target (separate from exit_price)
          lot_size: number | null
          risk_tier: string // "a", "b", "c"
          risk_amount: number
          
          // Setup & Context (Entry stage)
          setup_name: string | null // User-selected setup
          session: string | null // "London", "New York", etc.
          bias_snapshot: string | null // Manual text entry
          
          // Manual market context (Entry stage)
          atr_pips: number | null
          spread: number | null
          slippage: number | null
          account_equity: number | null
          
          // Psychology & Discipline (Entry stage)
          confidence: number | null // 1-5 scale
          emotions: Json | null // {calm_stressed, focus, urge_recover}
          checklist_passed: boolean | null
          checklist_items_skipped: string[] | null // ✅ PHASE 3D - which items were unchecked
          checklist_items_all: string[] | null // ✅ PHASE 3D - all items shown (for historical reference)
          discipline_tag: string | null // "followed_plan", "FOMO", etc.
          notes: string | null
          
          // ✅ PHASE 3E: Market Context (Entry stage)
          htf_bias: string | null // 'Bullish', 'Bearish', 'Neutral'
          htf_bias_tf: string | null // 'D1', 'H4', 'H1'
          bias_aligned: boolean | null // Auto: direction matches htf_bias
          vwap_type: string | null // 'Session', 'Day', 'Week', 'Anchored'
          vwap_band: string | null // 'Below −3σ', '−3σ to −2σ', etc.
          vwap_side: string | null // 'Above', 'At', 'Below' (auto)
          atr_tf: string | null // 'M1', 'M5', 'M15', 'M30', 'H1'
          atr_period: number | null // 5, 7, 10, 14, 20
          atr_value_pips: number | null // ATR value in pips
          atr_units: string | null // 'pips', 'ticks', 'points'
          atr_bucket: string | null // 'Low', 'Normal', 'High', 'Extreme' (auto)
          profile_scope: string | null // 'Session', 'Prior Day', 'Week', etc.
          fva_position: string | null // 'Below VAL', 'VAL to POC', etc.
          inside_value: boolean | null // Auto: between VAL-VAH
          outside_value: boolean | null // Auto: above VAH or below VAL
          poi_type: string | null // 'Order Block (Bull)', 'FVG', etc.
          poi_scope: string | null // 'Intra-day', 'Prior Day', etc.
          
          // Exit data (Close/Manage stage)
          exit_time: string | null
          exit_price: number | null
          pnl: number | null
          r_multiple: number | null
          duration_minutes: number | null
          
          // MAE/MFE Analytics (Manual entry on close)
          mae_r: number | null // Max Adverse Excursion in R
          mfe_r: number | null // Max Favorable Excursion in R
          efficiency: number | null // Calculated: r_multiple / mfe_r
          
          // Trade Management (Close/Manage stage)
          moved_to_be: boolean | null
          be_trigger_r: number | null // At what R moved to BE
          partial_at_2r: boolean | null
          used_trailing_stop: boolean | null
          orderflow_exit: boolean | null
          exit_reason: string | null // "Target hit", "Stop hit", etc.
          
          // Reflection (Close/Manage stage)
          trade_lessons: string | null
          mistake_tags: string[] | null
          good_actions: string[] | null
          screenshot_url: string | null
          
          // Meta
          status: string | null // "open", "closed"
          is_experimental: boolean | null
          override_reason: string | null
          created_at: string | null
          updated_at: string | null
          
          // DEPRECATED (kept for backward compatibility)
          model: string // DEPRECATED: use setup_name
          locations: string[] | null // DEPRECATED: use setup_name
          aggression: string[] | null // DEPRECATED
          scenarios: string[] | null // DEPRECATED
          trading_session: string | null // DEPRECATED: use session
          hypothesis_id: string | null // DEPRECATED
          externals: string[] | null // DEPRECATED
        }
        Insert: {
          // Required fields
          asset: string
          direction: string
          entry_price: number
          stop_loss: number
          risk_amount: number
          risk_tier: string
          user_id: string
          model: string // DEPRECATED but required by DB constraint
          
          // Optional core fields
          id?: string
          challenge_id?: string | null
          entry_time?: string | null
          target_price?: number | null
          lot_size?: number | null
          
          // Optional setup & context
          setup_name?: string | null
          session?: string | null
          bias_snapshot?: string | null
          
          // Optional manual market context
          atr_pips?: number | null
          spread?: number | null
          slippage?: number | null
          account_equity?: number | null
          
          // Optional psychology & discipline
          confidence?: number | null
          emotions?: Json | null
          checklist_passed?: boolean | null
          checklist_items_skipped?: string[] | null // ✅ PHASE 3D
          checklist_items_all?: string[] | null // ✅ PHASE 3D
          discipline_tag?: string | null
          notes?: string | null
          
          // ✅ PHASE 3E: Optional market context
          htf_bias?: string | null
          htf_bias_tf?: string | null
          bias_aligned?: boolean | null
          vwap_type?: string | null
          vwap_band?: string | null
          vwap_side?: string | null
          atr_tf?: string | null
          atr_period?: number | null
          atr_value_pips?: number | null
          atr_units?: string | null
          atr_bucket?: string | null
          profile_scope?: string | null
          fva_position?: string | null
          inside_value?: boolean | null
          outside_value?: boolean | null
          poi_type?: string | null
          poi_scope?: string | null
          
          // Optional exit data
          exit_time?: string | null
          exit_price?: number | null
          pnl?: number | null
          r_multiple?: number | null
          duration_minutes?: number | null
          
          // Optional MAE/MFE analytics
          mae_r?: number | null
          mfe_r?: number | null
          efficiency?: number | null
          
          // Optional trade management
          moved_to_be?: boolean | null
          be_trigger_r?: number | null
          partial_at_2r?: boolean | null
          used_trailing_stop?: boolean | null
          orderflow_exit?: boolean | null
          exit_reason?: string | null
          
          // Optional reflection
          trade_lessons?: string | null
          mistake_tags?: string[] | null
          good_actions?: string[] | null
          screenshot_url?: string | null
          
          // Optional meta
          status?: string | null
          is_experimental?: boolean | null
          override_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
          
          // DEPRECATED (optional for backward compatibility)
          locations?: string[] | null
          aggression?: string[] | null
          scenarios?: string[] | null
          trading_session?: string | null
          hypothesis_id?: string | null
          externals?: string[] | null
        }
        Update: {
          // All fields optional for updates
          id?: string
          user_id?: string
          challenge_id?: string | null
          
          // Core trade data
          asset?: string
          direction?: string
          entry_time?: string | null
          entry_price?: number
          stop_loss?: number
          target_price?: number | null
          lot_size?: number | null
          risk_tier?: string
          risk_amount?: number
          
          // Setup & context
          setup_name?: string | null
          session?: string | null
          bias_snapshot?: string | null
          
          // Manual market context
          atr_pips?: number | null
          spread?: number | null
          slippage?: number | null
          account_equity?: number | null
          
          // Psychology & discipline
          confidence?: number | null
          emotions?: Json | null
          checklist_passed?: boolean | null
          checklist_items_skipped?: string[] | null // ✅ PHASE 3D
          checklist_items_all?: string[] | null // ✅ PHASE 3D
          discipline_tag?: string | null
          notes?: string | null
          
          // ✅ PHASE 3E: Market context
          htf_bias?: string | null
          htf_bias_tf?: string | null
          bias_aligned?: boolean | null
          vwap_type?: string | null
          vwap_band?: string | null
          vwap_side?: string | null
          atr_tf?: string | null
          atr_period?: number | null
          atr_value_pips?: number | null
          atr_units?: string | null
          atr_bucket?: string | null
          profile_scope?: string | null
          fva_position?: string | null
          inside_value?: boolean | null
          outside_value?: boolean | null
          poi_type?: string | null
          poi_scope?: string | null
          
          // Exit data
          exit_time?: string | null
          exit_price?: number | null
          pnl?: number | null
          r_multiple?: number | null
          duration_minutes?: number | null
          
          // MAE/MFE analytics
          mae_r?: number | null
          mfe_r?: number | null
          efficiency?: number | null
          
          // Trade management
          moved_to_be?: boolean | null
          be_trigger_r?: number | null
          partial_at_2r?: boolean | null
          used_trailing_stop?: boolean | null
          orderflow_exit?: boolean | null
          exit_reason?: string | null
          
          // Reflection
          trade_lessons?: string | null
          mistake_tags?: string[] | null
          good_actions?: string[] | null
          screenshot_url?: string | null
          
          // Meta
          status?: string | null
          is_experimental?: boolean | null
          override_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
          
          // DEPRECATED (optional for backward compatibility)
          model?: string
          locations?: string[] | null
          aggression?: string[] | null
          scenarios?: string[] | null
          trading_session?: string | null
          hypothesis_id?: string | null
          externals?: string[] | null
        }
        Relationships: []
      }
      post_trade_observations: {
        Row: {
          id: string
          trade_id: string
          user_id: string
          observation_type: string // 'post_stop' | 'post_target'
          observation_time: string // '15m', '1h', '4h', 'EOD', 'next_day'
          observed_at: string | null
          price_action: string | null // 'continuation' | 'reversal' | 'consolidation' | 'unclear'
          peak_price: number | null
          pips_moved: number | null
          r_moved: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          trade_id: string
          user_id: string
          observation_type: string
          observation_time: string
          observed_at?: string | null
          price_action?: string | null
          peak_price?: number | null
          pips_moved?: number | null
          r_moved?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          trade_id?: string
          user_id?: string
          observation_type?: string
          observation_time?: string
          observed_at?: string | null
          price_action?: string | null
          peak_price?: number | null
          pips_moved?: number | null
          r_moved?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_trade_observations_trade_id_fkey"
            columns: ["trade_id"]
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_trade_observations_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      daily_reflection: {
        Row: {
          id: string
          user_id: string
          reflection_date: string
          total_trades: number | null
          net_r_multiple: number | null
          net_pnl: number | null
          avg_emotional_score: number | null
          emotional_stability_score: number | null
          plan_adherence_percentage: number | null
          bias_accuracy_percentage: number | null
          session_discipline_percentage: number | null
          top_mistakes: string[] | null
          improvement_areas: string[] | null
          positive_actions: string[] | null
          daily_notes: string | null
          key_learnings: string | null
          tomorrow_focus: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          reflection_date: string
          total_trades?: number | null
          net_r_multiple?: number | null
          net_pnl?: number | null
          avg_emotional_score?: number | null
          emotional_stability_score?: number | null
          plan_adherence_percentage?: number | null
          bias_accuracy_percentage?: number | null
          session_discipline_percentage?: number | null
          top_mistakes?: string[] | null
          improvement_areas?: string[] | null
          positive_actions?: string[] | null
          daily_notes?: string | null
          key_learnings?: string | null
          tomorrow_focus?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          reflection_date?: string
          total_trades?: number | null
          net_r_multiple?: number | null
          net_pnl?: number | null
          avg_emotional_score?: number | null
          emotional_stability_score?: number | null
          plan_adherence_percentage?: number | null
          bias_accuracy_percentage?: number | null
          session_discipline_percentage?: number | null
          top_mistakes?: string[] | null
          improvement_areas?: string[] | null
          positive_actions?: string[] | null
          daily_notes?: string | null
          key_learnings?: string | null
          tomorrow_focus?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trade_reflection: {
        Row: {
          id: string
          user_id: string
          trade_id: string
          emotional_rating: number | null
          emotional_tags: string[] | null
          execution_quality: number | null
          checklist_completion_percentage: number | null
          why_took_trade: string | null
          execution_flaws: string | null
          improvement_ideas: string | null
          what_went_well: string | null
          bias_match: boolean | null
          session_appropriate: boolean | null
          screenshot_analysis: string | null
          chart_pattern_recognition: string | null
          key_takeaways: string[] | null
          mistakes_to_avoid: string[] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          trade_id: string
          emotional_rating?: number | null
          emotional_tags?: string[] | null
          execution_quality?: number | null
          checklist_completion_percentage?: number | null
          why_took_trade?: string | null
          execution_flaws?: string | null
          improvement_ideas?: string | null
          what_went_well?: string | null
          bias_match?: boolean | null
          session_appropriate?: boolean | null
          screenshot_analysis?: string | null
          chart_pattern_recognition?: string | null
          key_takeaways?: string[] | null
          mistakes_to_avoid?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          trade_id?: string
          emotional_rating?: number | null
          emotional_tags?: string[] | null
          execution_quality?: number | null
          checklist_completion_percentage?: number | null
          why_took_trade?: string | null
          execution_flaws?: string | null
          improvement_ideas?: string | null
          what_went_well?: string | null
          bias_match?: boolean | null
          session_appropriate?: boolean | null
          screenshot_analysis?: string | null
          chart_pattern_recognition?: string | null
          key_takeaways?: string[] | null
          mistakes_to_avoid?: string[] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      challenge_phases: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          phase: string
          prop_firm: string
          starting_balance: number
          status: string
          started_at: string
          target_profit: number
          updated_at: string | null
          user_id: string
          user_reported_current_balance: number | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          phase?: string
          prop_firm: string
          starting_balance: number
          status?: string
          started_at?: string
          target_profit: number
          updated_at?: string | null
          user_id: string
          user_reported_current_balance?: number | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          phase?: string
          prop_firm?: string
          starting_balance?: number
          status?: string
          started_at?: string
          target_profit?: number
          updated_at?: string | null
          user_id?: string
          user_reported_current_balance?: number | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          auto_backup: boolean | null
          auto_save: boolean | null
          bias_reminders: boolean | null
          compact_mode: boolean | null
          created_at: string | null
          custom_good_actions: string[] | null
          custom_mistake_tags: string[] | null
          custom_risk_amounts: Json | null
          daily_wrap_time: string | null
          data_retention_days: number | null
          debug_mode: boolean | null
          default_model: string | null
          default_risk_amount: number | null
          edge_reminders: Json | null
          enable_house_money: boolean | null
          enable_stop_rule: boolean | null
          experimental_features: boolean | null
          export_format: string | null
          house_money_threshold: number | null
          id: string
          last_aggression: string[] | null
          last_locations: string[] | null
          last_model: string | null
          last_risk_tier: string | null
          max_daily_losses: number | null
          notifications_enabled: boolean | null
          offline_mode: boolean | null
          preferred_assets: string[] | null
          session_alerts: boolean | null
          show_advanced_features: boolean | null
          theme: string | null
          trade_alerts: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_backup?: boolean | null
          auto_save?: boolean | null
          bias_reminders?: boolean | null
          compact_mode?: boolean | null
          created_at?: string | null
          custom_good_actions?: string[] | null
          custom_mistake_tags?: string[] | null
          custom_risk_amounts?: Json | null
          daily_wrap_time?: string | null
          data_retention_days?: number | null
          debug_mode?: boolean | null
          default_model?: string | null
          default_risk_amount?: number | null
          edge_reminders?: Json | null
          enable_house_money?: boolean | null
          enable_stop_rule?: boolean | null
          experimental_features?: boolean | null
          export_format?: string | null
          house_money_threshold?: number | null
          id?: string
          last_aggression?: string[] | null
          last_locations?: string[] | null
          last_model?: string | null
          last_risk_tier?: string | null
          max_daily_losses?: number | null
          notifications_enabled?: boolean | null
          offline_mode?: boolean | null
          preferred_assets?: string[] | null
          session_alerts?: boolean | null
          show_advanced_features?: boolean | null
          theme?: string | null
          trade_alerts?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_backup?: boolean | null
          auto_save?: boolean | null
          bias_reminders?: boolean | null
          compact_mode?: boolean | null
          created_at?: string | null
          custom_good_actions?: string[] | null
          custom_mistake_tags?: string[] | null
          custom_risk_amounts?: Json | null
          daily_wrap_time?: string | null
          data_retention_days?: number | null
          debug_mode?: boolean | null
          default_model?: string | null
          default_risk_amount?: number | null
          edge_reminders?: Json | null
          enable_house_money?: boolean | null
          enable_stop_rule?: boolean | null
          experimental_features?: boolean | null
          export_format?: string | null
          house_money_threshold?: number | null
          id?: string
          last_aggression?: string[] | null
          last_locations?: string[] | null
          last_model?: string | null
          last_risk_tier?: string | null
          max_daily_losses?: number | null
          notifications_enabled?: boolean | null
          offline_mode?: boolean | null
          preferred_assets?: string[] | null
          session_alerts?: boolean | null
          show_advanced_features?: boolean | null
          theme?: string | null
          trade_alerts?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_trades_analytics: {
        Row: {
          // All fields from trades table
          id: string
          user_id: string
          asset: string
          direction: string
          entry_price: number
          stop_loss: number
          exit_price: number | null
          pnl: number | null
          r_multiple: number | null
          setup_name: string | null
          session: string | null
          efficiency: number | null
          mae_r: number | null
          mfe_r: number | null
          confidence: number | null
          discipline_tag: string | null
          // Plus calculated fields
          efficiency_safe: number | null
          risk_efficiency: number | null
          capture_percentage: number | null
          // ... (all other trade fields available)
          [key: string]: any // Allow other trade fields
        }
        Relationships: []
      }
      v_trade_observations: {
        Row: {
          trade_id: string
          user_id: string
          asset: string
          setup_name: string | null
          session: string | null
          direction: string
          entry_time: string | null
          exit_time: string | null
          entry_price: number
          stop_loss: number
          exit_price: number | null
          target_price: number | null
          pnl: number | null
          r_multiple: number | null
          risk_amount: number
          exit_reason: string | null
          moved_to_be: boolean | null
          be_trigger_r: number | null
          efficiency: number | null
          mae_r: number | null
          mfe_r: number | null
          confidence: number | null
          discipline_tag: string | null
          observation_id: string | null
          observation_type: string | null
          observation_time: string | null
          observed_at: string | null
          price_action: string | null
          peak_price: number | null
          pips_moved: number | null
          r_moved: number | null
          observation_notes: string | null
          observation_insight: string | null
        }
        Relationships: []
      }
      daily_performance_metrics: {
        Row: {
          avg_pnl: number | null
          avg_r_multiple: number | null
          best_trade: number | null
          closed_trades: number | null
          losing_trades: number | null
          mr_pnl: number | null
          mr_trades: number | null
          open_trades: number | null
          total_pnl: number | null
          total_trades: number | null
          trade_date: string | null
          trend_pnl: number | null
          trend_trades: number | null
          user_id: string | null
          winning_trades: number | null
          worst_trade: number | null
        }
        Relationships: []
      }
      secure_daily_performance_metrics: {
        Row: {
          avg_pnl: number | null
          avg_r_multiple: number | null
          best_trade: number | null
          closed_trades: number | null
          losing_trades: number | null
          mr_pnl: number | null
          mr_trades: number | null
          open_trades: number | null
          total_pnl: number | null
          total_trades: number | null
          trade_date: string | null
          trend_pnl: number | null
          trend_trades: number | null
          user_id: string | null
          winning_trades: number | null
          worst_trade: number | null
        }
        Relationships: []
      }
      v_current_bias: {
        Row: {
          active: boolean | null
          bias: string | null
          confidence: string | null
          day_key: string | null
          id: string | null
          market_state: string | null
          selected_at: string | null
          selected_by: string | null
          tags: Json | null
        }
        Relationships: []
      }
      v_current_session_pattern: {
        Row: {
          asia_behavior: Database["public"]["Enums"]["session_behavior"] | null
          confidence: number | null
          created_at: string | null
          date: string | null
          id: string | null
          inferred_scenario:
            | Database["public"]["Enums"]["session_scenario"]
            | null
          london_behavior:
            | Database["public"]["Enums"]["session_behavior"]
            | null
          notes: string | null
          ny_behavior: Database["public"]["Enums"]["session_behavior"] | null
          scenario_hint: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          asia_behavior?: Database["public"]["Enums"]["session_behavior"] | null
          confidence?: number | null
          created_at?: string | null
          date?: string | null
          id?: string | null
          inferred_scenario?:
            | Database["public"]["Enums"]["session_scenario"]
            | null
          london_behavior?:
            | Database["public"]["Enums"]["session_behavior"]
            | null
          notes?: string | null
          ny_behavior?: Database["public"]["Enums"]["session_behavior"] | null
          scenario_hint?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          asia_behavior?: Database["public"]["Enums"]["session_behavior"] | null
          confidence?: number | null
          created_at?: string | null
          date?: string | null
          id?: string | null
          inferred_scenario?:
            | Database["public"]["Enums"]["session_scenario"]
            | null
          london_behavior?:
            | Database["public"]["Enums"]["session_behavior"]
            | null
          notes?: string | null
          ny_behavior?: Database["public"]["Enums"]["session_behavior"] | null
          scenario_hint?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          id: string
          user_id: string
          category: string
          priority: string
          title: string
          description: string
          action: string | null
          potential_impact: number | null
          evidence: Json | null
          status: string
          created_at: string | null
          expires_at: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          category: string
          priority?: string
          title: string
          description: string
          action?: string | null
          potential_impact?: number | null
          evidence?: Json | null
          status?: string
          created_at?: string | null
          expires_at?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          priority?: string
          title?: string
          description?: string
          action?: string | null
          potential_impact?: number | null
          evidence?: Json | null
          status?: string
          created_at?: string | null
          expires_at?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
            referencedSchema: "auth"
          }
        ]
      }
    }
    Functions: {
      database_health_check: {
        Args: Record<PropertyKey, never>
        Returns: {
          check_name: string
          details: string
          status: string
        }[]
      }
      get_current_bias: {
        Args: { target_day: string }
        Returns: {
          active: boolean | null
          bias: string
          confidence: string | null
          created_at: string | null
          day_key: string
          id: string
          market_state: string | null
          selected_at: string | null
          selected_by: string | null
          tags: Json | null
          updated_at: string | null
        }
      }
      get_daily_losses: {
        Args: { p_date?: string; p_user_id: string }
        Returns: number
      }
      get_user_trade_stats: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          avg_pnl: number
          avg_r_multiple: number
          closed_trades: number
          losing_trades: number
          mr_pnl: number
          mr_trades: number
          open_trades: number
          total_pnl: number
          total_trades: number
          trend_pnl: number
          trend_trades: number
          win_rate: number
          winning_trades: number
        }[]
      }
      infer_session_scenario: {
        Args: {
          asia_behavior: Database["public"]["Enums"]["session_behavior"]
          london_behavior: Database["public"]["Enums"]["session_behavior"]
          ny_behavior: Database["public"]["Enums"]["session_behavior"]
        }
        Returns: {
          confidence: number
          expected_asia: Database["public"]["Enums"]["session_behavior"]
          expected_london: Database["public"]["Enums"]["session_behavior"]
          expected_ny: Database["public"]["Enums"]["session_behavior"]
          scenario: Database["public"]["Enums"]["session_scenario"]
        }[]
      }
      refresh_daily_performance_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_bias_state: {
        Args: {
          target_bias: string
          target_confidence?: string
          target_day: string
          target_market_state?: string
          target_tags?: string[]
        }
        Returns: {
          active: boolean | null
          bias: string
          confidence: string | null
          created_at: string | null
          day_key: string
          id: string
          market_state: string | null
          selected_at: string | null
          selected_by: string | null
          tags: Json | null
          updated_at: string | null
        }
      }
      validate_bias_value: {
        Args: { bias_value: string }
        Returns: boolean
      }
      validate_market_state_value: {
        Args: { market_state_value: string }
        Returns: boolean
      }
      generate_daily_reflection: {
        Args: { p_user_id: string; p_reflection_date?: string }
        Returns: {
          id: string
          user_id: string
          reflection_date: string
          total_trades: number | null
          net_r_multiple: number | null
          net_pnl: number | null
          avg_emotional_score: number | null
          emotional_stability_score: number | null
          plan_adherence_percentage: number | null
          bias_accuracy_percentage: number | null
          session_discipline_percentage: number | null
          top_mistakes: string[] | null
          improvement_areas: string[] | null
          positive_actions: string[] | null
          daily_notes: string | null
          key_learnings: string | null
          tomorrow_focus: string | null
          created_at: string | null
          updated_at: string | null
        }
      }
      get_reflection_analytics: {
        Args: { p_user_id: string; p_days?: number }
        Returns: {
          reflection_date: string
          total_trades: number
          net_r_multiple: number
          net_pnl: number
          emotional_score: number
          plan_adherence: number
          bias_accuracy: number
          session_discipline: number
          top_mistakes: string[]
          positive_actions: string[]
        }[]
      }
      get_observation_summary: {
        Args: { p_user_id: string }
        Returns: {
          total_observations: number
          trades_observed: number
          avg_r_moved: number
          continuations: number
          reversals: number
          consolidations: number
          post_stop_count: number
          post_target_count: number
        }[]
      }
      get_continuation_by_setup: {
        Args: { p_user_id: string }
        Returns: {
          setup_name: string
          target_hit_trades: number
          continuations: number
          continuation_rate: number
          avg_extra_r: number
          total_missed_r: number
        }[]
      }
      get_reversal_after_stop_by_setup: {
        Args: { p_user_id: string }
        Returns: {
          setup_name: string
          stopped_trades: number
          reversals: number
          reversal_rate: number
          avg_r_saved: number
          stop_quality_score: number
        }[]
      }
      get_optimal_observation_window: {
        Args: { p_user_id: string }
        Returns: {
          observation_time: string
          observation_count: number
          avg_r_moved: number
          avg_continuation_r: number
          avg_reversal_r: number
        }[]
      }
      get_exit_quality_by_setup: {
        Args: { p_user_id: string }
        Returns: {
          setup_name: string
          trade_count: number
          avg_efficiency: number
          avg_captured_r: number
          avg_missed_r: number
          exit_quality_score: number
        }[]
      }
      get_missed_r_timeline: {
        Args: { p_user_id: string; p_days?: number }
        Returns: {
          trade_date: string
          daily_missed_r: number
          cumulative_missed_r: number
          trades_with_continuation: number
        }[]
      }
      get_confidence_performance: {
        Args: { p_user_id: string }
        Returns: {
          confidence_level: number
          trade_count: number
          avg_r_multiple: number
          avg_efficiency: number
          win_rate: number
          avg_pnl: number
        }[]
      }
      get_discipline_performance: {
        Args: { p_user_id: string }
        Returns: {
          discipline_tag: string
          trade_count: number
          avg_r_multiple: number
          avg_efficiency: number
          win_rate: number
          avg_pnl: number
          avg_missed_r: number
        }[]
      }
      get_efficiency_by_setup: {
        Args: { p_user_id: string }
        Returns: {
          setup_name: string
          trade_count: number
          avg_efficiency: number
          avg_mae_r: number
          avg_mfe_r: number
          avg_r_multiple: number
          trades_with_efficiency: number
        }[]
      }
      get_fomo_cost_analysis: {
        Args: { p_user_id: string }
        Returns: {
          tag: string
          trade_count: number
          total_r: number
          avg_r: number
          win_rate: number
          expected_gain_if_removed: number
        }[]
      }
      get_continuation_opportunities: {
        Args: { p_user_id: string }
        Returns: {
          setup_name: string
          continuation_rate: number
          avg_extra_r: number
          target_hit_trades: number
          recommended_hold_fraction: number
          potential_improvement_r: number
        }[]
      }
      get_confidence_calibration: {
        Args: { p_user_id: string }
        Returns: {
          confidence_level: number
          trade_count: number
          win_rate: number
          avg_r: number
          calibration_flag: string
        }[]
      }
      generate_recommendations: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_checklist_item_impact: {
        Args: { p_user_id: string }
        Returns: {
          item_text: string
          times_skipped: number
          times_not_skipped: number
          win_rate_when_skipped: number
          win_rate_when_not_skipped: number
          avg_r_when_skipped: number
          avg_r_when_not_skipped: number
          impact_difference: number
          impact_total_r: number
          recommendation_priority: string
        }[]
      }
      generate_checklist_recommendations: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_htf_bias_impact: {
        Args: { p_user_id: string }
        Returns: {
          htf_bias: string
          aligned_count: number
          not_aligned_count: number
          aligned_win_rate: number
          not_aligned_win_rate: number
          aligned_avg_r: number
          not_aligned_avg_r: number
          impact_difference: number
          total_impact_r: number
          recommendation: string
        }[]
      }
      get_vwap_performance: {
        Args: { p_user_id: string }
        Returns: {
          vwap_band: string
          trade_count: number
          win_rate: number
          avg_r: number
          best_band: boolean
        }[]
      }
      get_fva_performance: {
        Args: { p_user_id: string }
        Returns: {
          fva_position: string
          trade_count: number
          win_rate: number
          avg_r: number
          best_zone: boolean
        }[]
      }
      get_poi_performance: {
        Args: { p_user_id: string }
        Returns: {
          poi_type: string
          trade_count: number
          win_rate: number
          avg_r: number
          best_poi: boolean
        }[]
      }
      generate_market_context_recommendations: {
        Args: { p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      bias_enum:
        | "OOB_LONG"
        | "OOB_SHORT"
        | "MR_LONG"
        | "MR_SHORT"
        | "NONE"
        | "FLAT"
      market_state_enum:
        | "TRENDING"
        | "RANGING"
        | "VOLATILE"
        | "CALM"
        | "UNCLEAR"
      session_behavior:
        | "continuation"
        | "reversal"
        | "consolidation"
        | "unknown"
      session_scenario: "S1" | "S2" | "S3" | "none"
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
      bias_enum: [
        "OOB_LONG",
        "OOB_SHORT",
        "MR_LONG",
        "MR_SHORT",
        "NONE",
        "FLAT",
      ],
      market_state_enum: ["TRENDING", "RANGING", "VOLATILE", "CALM", "UNCLEAR"],
      session_behavior: [
        "continuation",
        "reversal",
        "consolidation",
        "unknown",
      ],
      session_scenario: ["S1", "S2", "S3", "none"],
    },
  },
} as const
