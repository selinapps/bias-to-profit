-- COMPLETE DATABASE FIX SCRIPT
-- This script creates all missing tables and fixes all database issues
-- Run this in Supabase SQL Editor

-- ============================================================================
-- CREATE ENUMS FIRST
-- ============================================================================

-- Create behavior enum
DO $$
BEGIN
  CREATE TYPE public.session_behavior AS ENUM ('continuation', 'reversal', 'consolidation', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create scenario enum
DO $$
BEGIN
  CREATE TYPE public.session_scenario AS ENUM ('S1', 'S2', 'S3', 'none');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- CREATE ALL MISSING TABLES
-- ============================================================================

-- 1. Create profiles table (FIXES 404 ERROR)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  timezone text DEFAULT 'UTC',
  risk_settings jsonb DEFAULT '{
    "tier_a": 100,
    "tier_b": 50,
    "tier_c": 25,
    "max_daily_loss": 500,
    "house_money_threshold": 3
  }',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. Create bias_state table
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

-- 3. Create trades table
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
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Create user_settings table (FIXES 406 ERROR)
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

-- 5. Create daily_session_patterns table (FIXES 404 ERROR)
CREATE TABLE IF NOT EXISTS public.daily_session_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  asia_behavior public.session_behavior NOT NULL DEFAULT 'unknown',
  london_behavior public.session_behavior NOT NULL DEFAULT 'unknown',
  ny_behavior public.session_behavior NOT NULL DEFAULT 'unknown',
  inferred_scenario public.session_scenario NOT NULL DEFAULT 'none',
  confidence integer CHECK (confidence >= 0 AND confidence <= 100),
  notes text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Bias state indexes
CREATE INDEX IF NOT EXISTS idx_bias_state_day_key ON public.bias_state(day_key);
CREATE INDEX IF NOT EXISTS idx_bias_state_active ON public.bias_state(active);
CREATE INDEX IF NOT EXISTS idx_bias_state_selected_by ON public.bias_state(selected_by);

-- Trades indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON public.trades(entry_time);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);

-- User settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Daily session patterns indexes
CREATE INDEX IF NOT EXISTS idx_daily_session_patterns_date ON public.daily_session_patterns (date);
CREATE INDEX IF NOT EXISTS idx_daily_session_patterns_user_date ON public.daily_session_patterns (user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_session_patterns_scenario ON public.daily_session_patterns (inferred_scenario);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bias_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_session_patterns ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bias state policies
DROP POLICY IF EXISTS "Users can view bias state" ON public.bias_state;
DROP POLICY IF EXISTS "Users can insert bias state" ON public.bias_state;
DROP POLICY IF EXISTS "Users can update bias state" ON public.bias_state;
DROP POLICY IF EXISTS "Users can delete bias state" ON public.bias_state;

CREATE POLICY "Users can view bias state" ON public.bias_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert bias state" ON public.bias_state FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update bias state" ON public.bias_state FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete bias state" ON public.bias_state FOR DELETE TO authenticated USING (true);

-- Trades policies
DROP POLICY IF EXISTS "Users can manage their own trades" ON public.trades;
CREATE POLICY "Users can manage their own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);

-- User settings policies
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
CREATE POLICY "Users can manage their own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- Daily session patterns policies
DROP POLICY IF EXISTS "Users can view their own session patterns" ON public.daily_session_patterns;
DROP POLICY IF EXISTS "Users can insert their own session patterns" ON public.daily_session_patterns;
DROP POLICY IF EXISTS "Users can update their own session patterns" ON public.daily_session_patterns;
DROP POLICY IF EXISTS "Users can delete their own session patterns" ON public.daily_session_patterns;

CREATE POLICY "Users can view their own session patterns" ON public.daily_session_patterns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own session patterns" ON public.daily_session_patterns
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own session patterns" ON public.daily_session_patterns
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own session patterns" ON public.daily_session_patterns
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- CREATE VIEWS AND FUNCTIONS
-- ============================================================================

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

-- Create the get_current_bias function
CREATE OR REPLACE FUNCTION public.get_current_bias(target_day date)
RETURNS public.bias_state
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bs
  FROM public.bias_state AS bs
  WHERE bs.day_key = target_day
    AND bs.active
  ORDER BY bs.selected_at DESC
  LIMIT 1;
$$;

-- Create the set_bias_state function
CREATE OR REPLACE FUNCTION public.set_bias_state(
  target_day date,
  target_bias text,
  target_market_state text DEFAULT NULL,
  target_confidence text DEFAULT NULL,
  target_tags text[] DEFAULT NULL
)
RETURNS public.bias_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_selected_by uuid := auth.uid();
  v_inserted public.bias_state;
BEGIN
  IF v_selected_by IS NULL THEN
    RAISE EXCEPTION 'Missing authenticated user for bias selection';
  END IF;

  UPDATE public.bias_state
     SET active = FALSE
   WHERE day_key = target_day
     AND active;

  INSERT INTO public.bias_state (
    day_key,
    bias,
    market_state,
    confidence,
    tags,
    selected_by,
    active
  )
  VALUES (
    target_day,
    target_bias,
    target_market_state,
    target_confidence,
    CASE WHEN target_tags IS NULL THEN NULL ELSE to_jsonb(target_tags) END,
    v_selected_by,
    TRUE
  )
  RETURNING * INTO v_inserted;

  RETURN v_inserted;
END;
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates (only if they don't exist)
DO $$
BEGIN
  -- Create profiles trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

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

  -- Create daily_session_patterns trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_daily_session_patterns_updated_at'
  ) THEN
    CREATE TRIGGER update_daily_session_patterns_updated_at
      BEFORE UPDATE ON public.daily_session_patterns
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Create session scenario inference function
CREATE OR REPLACE FUNCTION public.infer_session_scenario(
  asia_behavior public.session_behavior,
  london_behavior public.session_behavior,
  ny_behavior public.session_behavior
) RETURNS TABLE(
  scenario public.session_scenario,
  confidence integer,
  expected_asia public.session_behavior,
  expected_london public.session_behavior,
  expected_ny public.session_behavior
) LANGUAGE plpgsql AS $$
DECLARE
  result_scenario public.session_scenario := 'none';
  result_confidence integer := 0;
  asia_expected public.session_behavior := asia_behavior;
  london_expected public.session_behavior := london_behavior;
  ny_expected public.session_behavior := ny_behavior;
  known_count integer := 0;
BEGIN
  -- Count known behaviors (need at least 2)
  known_count := 0;
  IF asia_behavior != 'unknown' THEN known_count := known_count + 1; END IF;
  IF london_behavior != 'unknown' THEN known_count := known_count + 1; END IF;
  IF ny_behavior != 'unknown' THEN known_count := known_count + 1; END IF;
  
  -- Need at least 2 known behaviors to make a prediction
  IF known_count < 2 THEN
    RETURN QUERY SELECT 'none'::public.session_scenario, 0, asia_behavior, london_behavior, ny_behavior;
    RETURN;
  END IF;

  -- S1: Asia=Consolidation, London=Reversal, NY=Continuation
  IF (asia_behavior = 'consolidation' OR asia_behavior = 'unknown') AND
     (london_behavior = 'reversal' OR london_behavior = 'unknown') AND
     (ny_behavior = 'continuation' OR ny_behavior = 'unknown') THEN
    result_scenario := 'S1';
    result_confidence := CASE 
      WHEN known_count = 3 THEN 100
      WHEN known_count = 2 THEN 67
      ELSE 50
    END;
    
    IF asia_behavior = 'unknown' THEN asia_expected := 'consolidation'; END IF;
    IF london_behavior = 'unknown' THEN london_expected := 'reversal'; END IF;
    IF ny_behavior = 'unknown' THEN ny_expected := 'continuation'; END IF;
  END IF;

  -- S2: Asia=Continuation, London=Consolidation, NY=Continuation
  IF (asia_behavior = 'continuation' OR asia_behavior = 'unknown') AND
     (london_behavior = 'consolidation' OR london_behavior = 'unknown') AND
     (ny_behavior = 'continuation' OR ny_behavior = 'unknown') AND
     result_scenario = 'none' THEN
    result_scenario := 'S2';
    result_confidence := CASE 
      WHEN known_count = 3 THEN 100
      WHEN known_count = 2 THEN 67
      ELSE 50
    END;
    
    IF asia_behavior = 'unknown' THEN asia_expected := 'continuation'; END IF;
    IF london_behavior = 'unknown' THEN london_expected := 'consolidation'; END IF;
    IF ny_behavior = 'unknown' THEN ny_expected := 'continuation'; END IF;
  END IF;

  -- S3: Asia=Continuation, London=Continuation, NY=Reversal
  IF (asia_behavior = 'continuation' OR asia_behavior = 'unknown') AND
     (london_behavior = 'continuation' OR london_behavior = 'unknown') AND
     (ny_behavior = 'reversal' OR ny_behavior = 'unknown') AND
     result_scenario = 'none' THEN
    result_scenario := 'S3';
    result_confidence := CASE 
      WHEN known_count = 3 THEN 100
      WHEN known_count = 2 THEN 67
      ELSE 50
    END;
    
    IF asia_behavior = 'unknown' THEN asia_expected := 'continuation'; END IF;
    IF london_behavior = 'unknown' THEN london_expected := 'continuation'; END IF;
    IF ny_behavior = 'unknown' THEN ny_expected := 'reversal'; END IF;
  END IF;

  RETURN QUERY SELECT result_scenario, result_confidence, asia_expected, london_expected, ny_expected;
END;
$$;

-- Create trigger to auto-update scenario when patterns change
CREATE OR REPLACE FUNCTION public.update_session_scenario()
RETURNS TRIGGER AS $$
DECLARE
  scenario_result RECORD;
BEGIN
  SELECT * INTO scenario_result FROM public.infer_session_scenario(
    NEW.asia_behavior,
    NEW.london_behavior,
    NEW.ny_behavior
  );
  
  NEW.inferred_scenario := scenario_result.scenario;
  NEW.confidence := scenario_result.confidence;
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_session_scenario'
  ) THEN
    CREATE TRIGGER trigger_update_session_scenario
      BEFORE INSERT OR UPDATE ON public.daily_session_patterns
      FOR EACH ROW
      EXECUTE FUNCTION public.update_session_scenario();
  END IF;
END $$;

-- Create view for easy access to current day's pattern
CREATE OR REPLACE VIEW public.v_current_session_pattern AS
SELECT 
  dsp.*,
  CASE 
    WHEN dsp.inferred_scenario = 'S1' THEN 'NY tends to continue after London reverses an Asian range.'
    WHEN dsp.inferred_scenario = 'S2' THEN 'Asia continues, London ranges, NY continues the trend.'
    WHEN dsp.inferred_scenario = 'S3' THEN 'Asia + London continue, watch NY for reversal.'
    ELSE 'No clear scenario pattern detected.'
  END as scenario_hint
FROM public.daily_session_patterns dsp
WHERE dsp.date = CURRENT_DATE;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION public.get_current_bias(date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_current_bias(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_bias_state(date, text, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.infer_session_scenario(public.session_behavior, public.session_behavior, public.session_behavior) TO authenticated;

-- Grant permissions for views
GRANT SELECT ON public.v_current_bias TO authenticated;
GRANT SELECT ON public.v_current_session_pattern TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '=== DATABASE FIX COMPLETED ===' as status;
SELECT 'All required tables have been created with proper RLS policies.' as message;
SELECT 'Your application should now work without database errors.' as next_step;

-- Test the exact queries that were failing
SELECT 'Testing profiles query...' as test;
SELECT id FROM public.profiles WHERE user_id = '6e7d8a45-709f-4b50-8229-d61fb6915310'::uuid LIMIT 1;

SELECT 'Testing user_settings query...' as test;
SELECT * FROM public.user_settings WHERE user_id = '6e7d8a45-709f-4b50-8229-d61fb6915310'::uuid LIMIT 1;

SELECT 'Testing daily_session_patterns query...' as test;
SELECT * FROM public.daily_session_patterns WHERE user_id = '6e7d8a45-709f-4b50-8229-d61fb6915310'::uuid AND date = '2025-09-30'::date LIMIT 1;
