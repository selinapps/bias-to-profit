-- Fix for trade addition failures
-- This migration adds missing columns and ensures proper table structure

-- Add lot_size column to trades table if it doesn't exist
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS lot_size DECIMAL(10,2) DEFAULT 1.0;

-- Ensure trades table has all required columns
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hypothesis_id uuid,
  
  -- Trading details
  asset text NOT NULL,
  direction text CHECK (direction IN ('long', 'short')) NOT NULL,
  model text CHECK (model IN ('trend', 'mean_reversion')) NOT NULL,
  
  -- Location and aggression
  locations text[] DEFAULT '{}',
  aggression text[],
  
  -- Risk management
  risk_tier text CHECK (risk_tier IN ('a', 'b', 'c')) NOT NULL,
  risk_amount decimal(10,2) NOT NULL,
  
  -- Price levels
  entry_price decimal(12,4) NOT NULL,
  stop_loss decimal(12,4) NOT NULL,
  exit_price decimal(12,4),
  
  -- Performance metrics
  pnl decimal(10,2),
  r_multiple decimal(6,3),
  
  -- Trading session and timing
  trading_session text,
  entry_time timestamp with time zone DEFAULT now(),
  exit_time timestamp with time zone,
  duration_minutes integer,
  
  -- Psychology and external factors
  emotions jsonb DEFAULT '{}',
  externals text[] DEFAULT '{}',
  
  -- Mistakes and tags
  mistake_tags text[] DEFAULT '{}',
  
  -- Scenarios used
  scenarios text[] DEFAULT '{}',
  
  -- Attachments
  screenshot_url text,
  notes text,
  
  -- Trade state
  status text CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  is_experimental boolean DEFAULT false,
  
  -- Override tracking
  override_reason text,
  
  -- Lot size
  lot_size decimal(10,2) DEFAULT 1.0,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON public.trades(entry_time);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);

-- Enable Row Level Security
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can manage their own trades" ON public.trades;
CREATE POLICY "Users can manage their own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);

-- Ensure user_settings table exists
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Last selections for persistence
  last_model text,
  last_risk_tier text,
  last_locations text[],
  last_aggression text[],
  
  -- Preferences
  daily_wrap_time time DEFAULT '21:00:00',
  notifications_enabled boolean DEFAULT true,
  offline_mode boolean DEFAULT false,
  
  -- Edge reminders
  edge_reminders jsonb DEFAULT '{}',
  
  -- Additional settings
  preferred_assets text[] DEFAULT '{}',
  default_risk_amount numeric DEFAULT 250,
  max_daily_losses integer DEFAULT 3,
  enable_stop_rule boolean DEFAULT true,
  enable_house_money boolean DEFAULT true,
  house_money_threshold integer DEFAULT 3,
  theme text DEFAULT 'dark',
  compact_mode boolean DEFAULT false,
  show_advanced_features boolean DEFAULT true,
  auto_save boolean DEFAULT true,
  trade_alerts boolean DEFAULT true,
  session_alerts boolean DEFAULT true,
  bias_reminders boolean DEFAULT true,
  data_retention_days integer DEFAULT 365,
  export_format text DEFAULT 'csv',
  auto_backup boolean DEFAULT false,
  experimental_features boolean DEFAULT false,
  debug_mode boolean DEFAULT false,
  custom_risk_amounts jsonb DEFAULT '{"a": 100, "b": 50, "c": 25}',
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Enable RLS for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_settings
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
CREATE POLICY "Users can manage their own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- Ensure bias_state table exists
CREATE TABLE IF NOT EXISTS public.bias_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_key date NOT NULL,
  bias text NOT NULL,
  market_state text,
  confidence text,
  tags jsonb,
  selected_at timestamp with time zone DEFAULT now(),
  selected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for bias_state
CREATE INDEX IF NOT EXISTS idx_bias_state_day_key ON public.bias_state(day_key);
CREATE INDEX IF NOT EXISTS idx_bias_state_active ON public.bias_state(active);
CREATE INDEX IF NOT EXISTS idx_bias_state_selected_by ON public.bias_state(selected_by);

-- Enable RLS for bias_state
ALTER TABLE public.bias_state ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for bias_state
DROP POLICY IF EXISTS "Users can view bias state" ON public.bias_state;
DROP POLICY IF EXISTS "Users can insert bias state" ON public.bias_state;
DROP POLICY IF EXISTS "Users can update bias state" ON public.bias_state;
DROP POLICY IF EXISTS "Users can delete bias state" ON public.bias_state;

CREATE POLICY "Users can view bias state" ON public.bias_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert bias state" ON public.bias_state FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update bias state" ON public.bias_state FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete bias state" ON public.bias_state FOR DELETE TO authenticated USING (true);

-- Create the v_current_bias view
DROP VIEW IF EXISTS public.v_current_bias;
CREATE VIEW public.v_current_bias AS
SELECT DISTINCT ON (day_key)
  day_key,
  id,
  bias,
  market_state,
  confidence,
  tags,
  selected_at,
  selected_by,
  active
FROM public.bias_state
WHERE active
ORDER BY day_key, selected_at DESC;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
DO $$
BEGIN
  -- Create bias_state trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_bias_state_updated_at'
  ) THEN
    CREATE TRIGGER update_bias_state_updated_at
      BEFORE UPDATE ON public.bias_state
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Create trades trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_trades_updated_at'
  ) THEN
    CREATE TRIGGER update_trades_updated_at
      BEFORE UPDATE ON public.trades
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  -- Create user_settings trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_settings_updated_at'
  ) THEN
    CREATE TRIGGER update_user_settings_updated_at
      BEFORE UPDATE ON public.user_settings
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
