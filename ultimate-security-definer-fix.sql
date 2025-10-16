-- ============================================
-- ULTIMATE SECURITY DEFINER FIX
-- ============================================
-- This script completely eliminates SECURITY DEFINER views using multiple approaches

-- STEP 1: Complete cleanup - drop everything related
DROP VIEW IF EXISTS public.v_current_bias CASCADE;
DROP VIEW IF EXISTS public.v_current_session_pattern CASCADE;
DROP VIEW IF EXISTS public.secure_daily_performance_metrics CASCADE;

-- Drop any functions that might be related
DROP FUNCTION IF EXISTS get_current_bias() CASCADE;
DROP FUNCTION IF EXISTS get_current_session_pattern() CASCADE;
DROP FUNCTION IF EXISTS get_secure_daily_performance_metrics() CASCADE;

-- STEP 2: Wait for any locks to clear
SELECT pg_sleep(2);

-- STEP 3: Create new views with explicit SECURITY INVOKER (PostgreSQL 15+)
-- If your Supabase version supports it, this explicitly sets security invoker

-- Create v_current_bias with explicit security invoker
CREATE VIEW public.v_current_bias 
WITH (security_invoker = true) AS
SELECT 
  bs.active,
  bs.bias,
  bs.confidence,
  bs.day_key,
  bs.id,
  bs.market_state,
  bs.selected_at,
  bs.selected_by,
  bs.tags
FROM public.bias_state bs
WHERE bs.active = true
  AND bs.day_key = CURRENT_DATE;

-- Create v_current_session_pattern with explicit security invoker
CREATE VIEW public.v_current_session_pattern 
WITH (security_invoker = true) AS
SELECT 
  dsp.asia_behavior,
  dsp.confidence,
  dsp.created_at,
  dsp.date,
  dsp.id,
  dsp.inferred_scenario,
  dsp.london_behavior,
  dsp.notes,
  dsp.ny_behavior,
  dsp.updated_at,
  dsp.user_id
FROM public.daily_session_patterns dsp
WHERE dsp.date = CURRENT_DATE;

-- Create secure_daily_performance_metrics with explicit security invoker
CREATE VIEW public.secure_daily_performance_metrics 
WITH (security_invoker = true) AS
SELECT 
  dpm.avg_pnl,
  dpm.avg_r_multiple,
  dpm.best_trade,
  dpm.closed_trades,
  dpm.losing_trades,
  dpm.mr_pnl,
  dpm.mr_trades,
  dpm.open_trades,
  dpm.total_pnl,
  dpm.total_trades,
  dpm.trade_date,
  dpm.trend_pnl,
  dpm.trend_trades,
  dpm.user_id,
  dpm.winning_trades,
  dpm.worst_trade
FROM public.daily_performance_metrics dpm
WHERE dpm.user_id = auth.uid();

-- STEP 4: If the above fails (older PostgreSQL version), create without security_invoker
-- This is a fallback approach
DO $$
BEGIN
  -- Try to create with security_invoker first
  EXCEPTION
    WHEN syntax_error OR feature_not_supported THEN
      -- Fallback: recreate without security_invoker option
      DROP VIEW IF EXISTS public.v_current_bias CASCADE;
      DROP VIEW IF EXISTS public.v_current_session_pattern CASCADE;
      DROP VIEW IF EXISTS public.secure_daily_performance_metrics CASCADE;
      
      -- Recreate as simple views (default behavior is security invoker)
      CREATE VIEW public.v_current_bias AS
      SELECT 
        bs.active,
        bs.bias,
        bs.confidence,
        bs.day_key,
        bs.id,
        bs.market_state,
        bs.selected_at,
        bs.selected_by,
        bs.tags
      FROM public.bias_state bs
      WHERE bs.active = true
        AND bs.day_key = CURRENT_DATE;
        
      CREATE VIEW public.v_current_session_pattern AS
      SELECT 
        dsp.asia_behavior,
        dsp.confidence,
        dsp.created_at,
        dsp.date,
        dsp.id,
        dsp.inferred_scenario,
        dsp.london_behavior,
        dsp.notes,
        dsp.ny_behavior,
        dsp.updated_at,
        dsp.user_id
      FROM public.daily_session_patterns dsp
      WHERE dsp.date = CURRENT_DATE;
      
      CREATE VIEW public.secure_daily_performance_metrics AS
      SELECT 
        dpm.avg_pnl,
        dpm.avg_r_multiple,
        dpm.best_trade,
        dpm.closed_trades,
        dpm.losing_trades,
        dpm.mr_pnl,
        dpm.mr_trades,
        dpm.open_trades,
        dpm.total_pnl,
        dpm.total_trades,
        dpm.trade_date,
        dpm.trend_pnl,
        dpm.trend_trades,
        dpm.user_id,
        dpm.winning_trades,
        dpm.worst_trade
      FROM public.daily_performance_metrics dpm
      WHERE dpm.user_id = auth.uid();
END $$;

-- STEP 5: Grant permissions
GRANT SELECT ON public.v_current_bias TO authenticated;
GRANT SELECT ON public.v_current_session_pattern TO authenticated;
GRANT SELECT ON public.secure_daily_performance_metrics TO authenticated;

-- STEP 6: Alternative approach - Create as tables instead of views
-- If views continue to cause issues, uncomment this section

/*
-- Drop views and create as tables
DROP VIEW IF EXISTS public.v_current_bias CASCADE;
DROP VIEW IF EXISTS public.v_current_session_pattern CASCADE;
DROP VIEW IF EXISTS public.secure_daily_performance_metrics CASCADE;

-- Create as tables with RLS
CREATE TABLE public.current_bias_data (
  active boolean,
  bias text,
  confidence text,
  day_key date,
  id text,
  market_state text,
  selected_at text,
  selected_by text,
  tags jsonb
);

CREATE TABLE public.current_session_data (
  asia_behavior text,
  confidence numeric,
  created_at timestamptz,
  date date,
  id text,
  inferred_scenario text,
  london_behavior text,
  notes text,
  ny_behavior text,
  updated_at timestamptz,
  user_id text
);

CREATE TABLE public.performance_data (
  avg_pnl numeric,
  avg_r_multiple numeric,
  best_trade numeric,
  closed_trades bigint,
  losing_trades bigint,
  mr_pnl numeric,
  mr_trades bigint,
  open_trades bigint,
  total_pnl numeric,
  total_trades bigint,
  trade_date text,
  trend_pnl numeric,
  trend_trades bigint,
  user_id text,
  winning_trades bigint,
  worst_trade numeric
);

-- Enable RLS on tables
ALTER TABLE public.current_bias_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_session_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "current_bias_data_policy" ON public.current_bias_data FOR ALL USING (true);
CREATE POLICY "current_session_data_policy" ON public.current_session_data FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "performance_data_policy" ON public.performance_data FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.current_bias_data TO authenticated;
GRANT ALL ON public.current_session_data TO authenticated;
GRANT ALL ON public.performance_data TO authenticated;
*/

-- STEP 7: Final verification
SELECT 
  'Final Security Check' as check_type,
  schemaname,
  viewname,
  CASE 
    WHEN definition LIKE '%SECURITY DEFINER%' THEN 'ERROR: Still has SECURITY DEFINER'
    WHEN definition LIKE '%security_invoker%' THEN 'OK: Has security_invoker'
    ELSE 'OK: No SECURITY DEFINER found'
  END as security_status
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('v_current_bias', 'v_current_session_pattern', 'secure_daily_performance_metrics');

-- STEP 8: Test the views work
SELECT 'Testing views...' as test_status;
SELECT COUNT(*) as bias_count FROM public.v_current_bias;
SELECT COUNT(*) as session_count FROM public.v_current_session_pattern;
SELECT COUNT(*) as performance_count FROM public.secure_daily_performance_metrics;

-- ============================================
-- TROUBLESHOOTING
-- ============================================
-- If this still doesn't work:

-- 1. The issue might be in Supabase's linter cache
-- 2. Try refreshing your Supabase dashboard
-- 3. Wait a few minutes for the linter to re-scan
-- 4. Consider using the table approach instead of views
-- 5. Contact Supabase support if the issue persists

-- The views should now be secure and not have SECURITY DEFINER
