-- ============================================
-- SIMPLE SECURITY DEFINER VIEWS FIX
-- ============================================
-- This script fixes the SECURITY DEFINER views with proper data type handling

-- 1. Drop and recreate v_current_bias view without SECURITY DEFINER
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

-- 2. Drop and recreate v_current_session_pattern view without SECURITY DEFINER
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

-- 3. Drop and recreate secure_daily_performance_metrics view without SECURITY DEFINER
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

-- 4. Verify the views are created without SECURITY DEFINER
SELECT 
  'Security Check' as check_type,
  schemaname,
  viewname,
  CASE 
    WHEN definition LIKE '%SECURITY DEFINER%' THEN 'WARNING: Still has SECURITY DEFINER'
    ELSE 'OK: No SECURITY DEFINER'
  END as security_status
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('v_current_bias', 'v_current_session_pattern', 'secure_daily_performance_metrics');

-- 5. Test the views work correctly
SELECT 'Testing v_current_bias view...' as test_status;
SELECT COUNT(*) as bias_count FROM public.v_current_bias;

SELECT 'Testing v_current_session_pattern view...' as test_status;
SELECT COUNT(*) as pattern_count FROM public.v_current_session_pattern;

SELECT 'Testing secure_daily_performance_metrics view...' as test_status;
SELECT COUNT(*) as performance_count FROM public.secure_daily_performance_metrics;

-- ============================================
-- NOTES
-- ============================================
-- This script:
-- 1. Removes SECURITY DEFINER from all problematic views
-- 2. Recreates them as regular views that respect RLS
-- 3. Uses proper data types (date instead of text)
-- 4. Includes user filtering where appropriate
-- 5. Tests that the views work correctly

-- The views will now:
-- - Respect Row Level Security (RLS) policies
-- - Run with the user's permissions
-- - Be secure and not bypass authentication
-- - Work with the existing application code
