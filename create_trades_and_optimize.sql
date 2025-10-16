-- Complete migration: Create trades table and apply performance optimizations
-- This script ensures the trades table exists before applying optimizations

-- Step 1: Create the trades table with all required columns
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

-- Step 2: Create basic indexes for trades table
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON public.trades(entry_time);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);

-- Step 3: Enable Row Level Security
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
DROP POLICY IF EXISTS "Users can manage their own trades" ON public.trades;
CREATE POLICY "Users can manage their own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);

-- Step 5: Create user_settings table if it doesn't exist
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

-- Step 6: Create bias_state table if it doesn't exist
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

-- Step 7: Create the v_current_bias view
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

-- Step 8: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Step 9: Create triggers for automatic timestamp updates
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

-- Step 10: Apply performance optimizations
-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_trades_user_status_time ON public.trades(user_id, status, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_exit_time ON public.trades(user_id, exit_time) WHERE exit_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_user_pnl ON public.trades(user_id, pnl) WHERE pnl IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_user_model ON public.trades(user_id, model);
CREATE INDEX IF NOT EXISTS idx_trades_user_asset ON public.trades(user_id, asset);

-- Add partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_trades_open_trades ON public.trades(user_id, entry_time DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_trades_closed_trades ON public.trades(user_id, exit_time DESC) WHERE status = 'closed';
CREATE INDEX IF NOT EXISTS idx_trades_daily_losses ON public.trades(user_id, exit_time, pnl) 
  WHERE status = 'closed' AND exit_time IS NOT NULL AND pnl < 0;

-- Add index for bias state queries
CREATE INDEX IF NOT EXISTS idx_bias_state_day_active ON public.bias_state(day_key, active) WHERE active = true;

-- Step 11: Create materialized view for daily performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_performance_metrics AS
SELECT 
  user_id,
  DATE(entry_time) as trade_date,
  COUNT(*) as total_trades,
  COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_trades,
  COUNT(CASE WHEN status = 'open' THEN 1 END) as open_trades,
  COUNT(CASE WHEN status = 'closed' AND pnl > 0 THEN 1 END) as winning_trades,
  COUNT(CASE WHEN status = 'closed' AND pnl < 0 THEN 1 END) as losing_trades,
  COALESCE(SUM(CASE WHEN status = 'closed' THEN pnl END), 0) as total_pnl,
  COALESCE(AVG(CASE WHEN status = 'closed' THEN pnl END), 0) as avg_pnl,
  COALESCE(MAX(CASE WHEN status = 'closed' THEN pnl END), 0) as best_trade,
  COALESCE(MIN(CASE WHEN status = 'closed' THEN pnl END), 0) as worst_trade,
  COALESCE(AVG(CASE WHEN status = 'closed' THEN r_multiple END), 0) as avg_r_multiple,
  COUNT(CASE WHEN model = 'trend' AND status = 'closed' THEN 1 END) as trend_trades,
  COUNT(CASE WHEN model = 'mean_reversion' AND status = 'closed' THEN 1 END) as mr_trades,
  COALESCE(SUM(CASE WHEN model = 'trend' AND status = 'closed' THEN pnl END), 0) as trend_pnl,
  COALESCE(SUM(CASE WHEN model = 'mean_reversion' AND status = 'closed' THEN pnl END), 0) as mr_pnl
FROM public.trades
GROUP BY user_id, DATE(entry_time);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_daily_performance_user_date ON public.daily_performance_metrics(user_id, trade_date DESC);

-- Step 12: Create optimized database functions
CREATE OR REPLACE FUNCTION public.get_daily_losses(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.trades
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND DATE(entry_time) = p_date
      AND pnl < 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_trade_stats(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (
  total_trades bigint,
  closed_trades bigint,
  open_trades bigint,
  winning_trades bigint,
  losing_trades bigint,
  total_pnl numeric,
  avg_pnl numeric,
  win_rate numeric,
  avg_r_multiple numeric,
  trend_trades bigint,
  mr_trades bigint,
  trend_pnl numeric,
  mr_pnl numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_trades,
    COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_trades,
    COUNT(CASE WHEN status = 'open' THEN 1 END) as open_trades,
    COUNT(CASE WHEN status = 'closed' AND pnl > 0 THEN 1 END) as winning_trades,
    COUNT(CASE WHEN status = 'closed' AND pnl < 0 THEN 1 END) as losing_trades,
    COALESCE(SUM(CASE WHEN status = 'closed' THEN pnl END), 0) as total_pnl,
    COALESCE(AVG(CASE WHEN status = 'closed' THEN pnl END), 0) as avg_pnl,
    CASE 
      WHEN COUNT(CASE WHEN status = 'closed' THEN 1 END) > 0 
      THEN (COUNT(CASE WHEN status = 'closed' AND pnl > 0 THEN 1 END)::numeric / COUNT(CASE WHEN status = 'closed' THEN 1 END)::numeric) * 100
      ELSE 0 
    END as win_rate,
    COALESCE(AVG(CASE WHEN status = 'closed' THEN r_multiple END), 0) as avg_r_multiple,
    COUNT(CASE WHEN model = 'trend' AND status = 'closed' THEN 1 END) as trend_trades,
    COUNT(CASE WHEN model = 'mean_reversion' AND status = 'closed' THEN 1 END) as mr_trades,
    COALESCE(SUM(CASE WHEN model = 'trend' AND status = 'closed' THEN pnl END), 0) as trend_pnl,
    COALESCE(SUM(CASE WHEN model = 'mean_reversion' AND status = 'closed' THEN pnl END), 0) as mr_pnl
  FROM public.trades
  WHERE user_id = p_user_id
    AND entry_time >= CURRENT_DATE - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 13: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_daily_losses(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_trade_stats(uuid, integer) TO authenticated;
GRANT SELECT ON public.daily_performance_metrics TO authenticated;

-- Step 14: Create a secure view for daily performance metrics instead of RLS on materialized view
-- Materialized views don't support RLS, so we'll create a secure view that filters by user
CREATE OR REPLACE VIEW public.secure_daily_performance_metrics AS
SELECT 
  user_id,
  trade_date,
  total_trades,
  closed_trades,
  open_trades,
  winning_trades,
  losing_trades,
  total_pnl,
  avg_pnl,
  best_trade,
  worst_trade,
  avg_r_multiple,
  trend_trades,
  mr_trades,
  trend_pnl,
  mr_pnl
FROM public.daily_performance_metrics
WHERE user_id = auth.uid();

-- Grant permissions on the secure view
GRANT SELECT ON public.secure_daily_performance_metrics TO authenticated;

-- Step 15: Refresh materialized view with initial data
REFRESH MATERIALIZED VIEW public.daily_performance_metrics;
