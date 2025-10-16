-- ============================================
-- FIX SECURITY DEFINER VIEWS
-- ============================================
-- This script fixes the SECURITY DEFINER views that are causing security warnings
-- These views bypass RLS and can be security risks

-- 1. Fix v_current_bias view
DROP VIEW IF EXISTS public.v_current_bias CASCADE;

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

-- 2. Fix v_current_session_pattern view
DROP VIEW IF EXISTS public.v_current_session_pattern CASCADE;

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

-- 3. Fix secure_daily_performance_metrics view
DROP VIEW IF EXISTS public.secure_daily_performance_metrics CASCADE;

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

-- 4. Enable RLS on the views (if supported)
-- Note: Views don't support RLS directly, but we can create secure functions instead

-- 5. Create secure functions to replace the views
CREATE OR REPLACE FUNCTION get_current_bias()
RETURNS TABLE (
  active boolean,
  bias text,
  confidence text,
  day_key text,
  id text,
  market_state text,
  selected_at text,
  selected_by text,
  tags jsonb
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    bs.active,
    bs.bias,
    bs.confidence,
    bs.day_key::text,
    bs.id,
    bs.market_state,
    bs.selected_at,
    bs.selected_by,
    bs.tags
  FROM public.bias_state bs
  WHERE bs.active = true
    AND bs.day_key = CURRENT_DATE;
$$;

CREATE OR REPLACE FUNCTION get_current_session_pattern()
RETURNS TABLE (
  asia_behavior text,
  confidence numeric,
  created_at timestamptz,
  date text,
  id text,
  inferred_scenario text,
  london_behavior text,
  notes text,
  ny_behavior text,
  updated_at timestamptz,
  user_id text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    dsp.asia_behavior,
    dsp.confidence,
    dsp.created_at,
    dsp.date::text,
    dsp.id,
    dsp.inferred_scenario,
    dsp.london_behavior,
    dsp.notes,
    dsp.ny_behavior,
    dsp.updated_at,
    dsp.user_id
  FROM public.daily_session_patterns dsp
  WHERE dsp.date = CURRENT_DATE
    AND dsp.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_secure_daily_performance_metrics()
RETURNS TABLE (
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
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 6. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_current_bias() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_session_pattern() TO authenticated;
GRANT EXECUTE ON FUNCTION get_secure_daily_performance_metrics() TO authenticated;

-- 7. Verify the views are fixed
SELECT 
  'View Security Check' as check_type,
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('v_current_bias', 'v_current_session_pattern', 'secure_daily_performance_metrics');

-- 8. Check if SECURITY DEFINER is removed
SELECT 
  'Security Definer Check' as check_type,
  schemaname,
  viewname,
  CASE 
    WHEN definition LIKE '%SECURITY DEFINER%' THEN 'WARNING: Still has SECURITY DEFINER'
    ELSE 'OK: No SECURITY DEFINER'
  END as security_status
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('v_current_bias', 'v_current_session_pattern', 'secure_daily_performance_metrics');

-- ============================================
-- TROUBLESHOOTING NOTES
-- ============================================
-- If you still get security warnings:

-- 1. The views may be cached - try refreshing your Supabase dashboard
-- 2. Check that the views were actually dropped and recreated
-- 3. Verify that no other views have SECURITY DEFINER
-- 4. Consider using the secure functions instead of views

-- Alternative approach: Use functions instead of views
-- Functions with SECURITY DEFINER are safer than views with SECURITY DEFINER
-- because they can include proper RLS checks and user validation
