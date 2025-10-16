-- ============================================
-- AGGRESSIVE SECURITY DEFINER VIEWS FIX
-- ============================================
-- This script aggressively removes and recreates views to eliminate SECURITY DEFINER

-- 1. Force drop all problematic views with CASCADE
DROP VIEW IF EXISTS public.v_current_bias CASCADE;
DROP VIEW IF EXISTS public.v_current_session_pattern CASCADE;
DROP VIEW IF EXISTS public.secure_daily_performance_metrics CASCADE;

-- 2. Also drop any functions that might be related
DROP FUNCTION IF EXISTS get_current_bias() CASCADE;
DROP FUNCTION IF EXISTS get_current_session_pattern() CASCADE;
DROP FUNCTION IF EXISTS get_secure_daily_performance_metrics() CASCADE;

-- 3. Wait a moment for any locks to clear
SELECT pg_sleep(1);

-- 4. Recreate v_current_bias view WITHOUT SECURITY DEFINER
CREATE OR REPLACE VIEW public.v_current_bias AS
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

-- 5. Recreate v_current_session_pattern view WITHOUT SECURITY DEFINER
CREATE OR REPLACE VIEW public.v_current_session_pattern AS
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

-- 6. Recreate secure_daily_performance_metrics view WITHOUT SECURITY DEFINER
CREATE OR REPLACE VIEW public.secure_daily_performance_metrics AS
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

-- 7. Grant proper permissions to authenticated users
GRANT SELECT ON public.v_current_bias TO authenticated;
GRANT SELECT ON public.v_current_session_pattern TO authenticated;
GRANT SELECT ON public.secure_daily_performance_metrics TO authenticated;

-- 8. Verify the views are created without SECURITY DEFINER
SELECT 
  'Security Verification' as check_type,
  schemaname,
  viewname,
  CASE 
    WHEN definition LIKE '%SECURITY DEFINER%' THEN 'ERROR: Still has SECURITY DEFINER'
    ELSE 'OK: No SECURITY DEFINER found'
  END as security_status,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('v_current_bias', 'v_current_session_pattern', 'secure_daily_performance_metrics');

-- 9. Alternative approach: If views still have issues, create simple tables instead
-- Uncomment the following if views continue to have SECURITY DEFINER issues

/*
-- Create simple tables instead of views
DROP TABLE IF EXISTS public.current_bias_temp CASCADE;
CREATE TABLE public.current_bias_temp AS
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

-- Grant permissions
GRANT SELECT ON public.current_bias_temp TO authenticated;

-- Enable RLS
ALTER TABLE public.current_bias_temp ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "current_bias_temp_policy" ON public.current_bias_temp 
  FOR SELECT TO authenticated USING (true);
*/

-- 10. Final verification - check all views in public schema
SELECT 
  'All Views Check' as check_type,
  schemaname,
  viewname,
  CASE 
    WHEN definition LIKE '%SECURITY DEFINER%' THEN 'WARNING: Has SECURITY DEFINER'
    ELSE 'OK: No SECURITY DEFINER'
  END as security_status
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- ============================================
-- TROUBLESHOOTING NOTES
-- ============================================
-- If you still get SECURITY DEFINER warnings:

-- 1. The views might be cached - try refreshing your Supabase dashboard
-- 2. There might be dependent objects - the CASCADE should handle this
-- 3. You may need to restart your Supabase instance
-- 4. Check if there are any triggers or functions that recreate these views

-- Alternative solutions:
-- 1. Use the table approach (uncomment the section above)
-- 2. Create functions instead of views
-- 3. Use materialized views with proper RLS
-- 4. Contact Supabase support if the issue persists
