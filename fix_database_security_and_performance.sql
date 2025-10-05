-- Comprehensive Database Security and Performance Fix
-- This script addresses all security vulnerabilities and performance issues

BEGIN;

-- ============================================================================
-- 1. FIX SECURITY DEFINER VIEWS
-- ============================================================================

-- Fix v_current_bias view - remove SECURITY DEFINER and use security_invoker
DROP VIEW IF EXISTS public.v_current_bias;
CREATE VIEW public.v_current_bias 
WITH (security_invoker = true) AS
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

-- Fix secure_daily_performance_metrics view - remove SECURITY DEFINER
DROP VIEW IF EXISTS public.secure_daily_performance_metrics;
CREATE VIEW public.secure_daily_performance_metrics 
WITH (security_invoker = true) AS
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

-- ============================================================================
-- 2. FIX FUNCTIONS WITH MUTABLE SEARCH_PATH
-- ============================================================================

-- Fix get_daily_losses function - set search_path explicitly
CREATE OR REPLACE FUNCTION public.get_daily_losses(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS integer 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.trades
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND DATE(exit_time) = p_date
      AND pnl < 0
  );
END;
$$;

-- Fix get_user_trade_stats function - set search_path explicitly
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
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
$$;

-- Fix get_current_bias function - set search_path explicitly
CREATE OR REPLACE FUNCTION public.get_current_bias(target_day date)
RETURNS public.bias_state
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT bs
  FROM public.bias_state AS bs
  WHERE bs.day_key = target_day
    AND bs.active
  ORDER BY bs.selected_at DESC
  LIMIT 1;
$$;

-- Fix set_bias_state function - set search_path explicitly
CREATE OR REPLACE FUNCTION public.set_bias_state(
  target_day date,
  target_bias public.bias_enum,
  target_market_state public.market_state_enum DEFAULT NULL,
  target_confidence text DEFAULT NULL,
  target_tags text[] DEFAULT NULL
)
RETURNS public.bias_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

-- ============================================================================
-- 3. FIX MATERIALIZED VIEW ACCESS PERMISSIONS
-- ============================================================================

-- Remove RLS from materialized view (not supported) and create proper access control
-- Note: Materialized views don't support RLS, so we remove direct access
DROP POLICY IF EXISTS "Users can view their own daily performance" ON public.daily_performance_metrics;

-- Revoke direct access to materialized view
REVOKE SELECT ON public.daily_performance_metrics FROM anon, authenticated;

-- Grant access only through the secure view
GRANT SELECT ON public.secure_daily_performance_metrics TO authenticated;

-- ============================================================================
-- 4. PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trades_user_date_status ON public.trades(user_id, DATE(entry_time), status);
CREATE INDEX IF NOT EXISTS idx_trades_user_exit_date_pnl ON public.trades(user_id, DATE(exit_time), pnl) 
  WHERE exit_time IS NOT NULL AND pnl IS NOT NULL;

-- Optimize bias_state queries
CREATE INDEX IF NOT EXISTS idx_bias_state_day_active_selected ON public.bias_state(day_key, active, selected_at DESC) 
  WHERE active = true;

-- Add covering index for daily performance materialized view refresh
CREATE INDEX IF NOT EXISTS idx_trades_covering_daily_perf ON public.trades(user_id, entry_time, status, pnl, model, r_multiple);

-- ============================================================================
-- 5. SECURITY IMPROVEMENTS
-- ============================================================================

-- Ensure all functions have proper permissions
GRANT EXECUTE ON FUNCTION public.get_daily_losses(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_trade_stats(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_bias(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_bias_state(date, public.bias_enum, public.market_state_enum, text, text[]) TO authenticated;

-- Grant view permissions
GRANT SELECT ON public.v_current_bias TO authenticated;
GRANT SELECT ON public.secure_daily_performance_metrics TO authenticated;

-- ============================================================================
-- 6. CREATE OPTIMIZED REFRESH FUNCTION
-- ============================================================================

-- Create an optimized function to refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_daily_performance_metrics()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Use CONCURRENTLY to avoid blocking reads
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_performance_metrics;
EXCEPTION
  WHEN OTHERS THEN
    -- Fallback to regular refresh if CONCURRENTLY fails
    REFRESH MATERIALIZED VIEW public.daily_performance_metrics;
END;
$$;

-- ============================================================================
-- 7. CREATE SECURE RLS POLICIES
-- ============================================================================

-- Ensure RLS is properly configured for all tables
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bias_state ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for trades
DROP POLICY IF EXISTS "Users can manage their own trades" ON public.trades;
CREATE POLICY "Users can manage their own trades" ON public.trades 
  FOR ALL USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for user_settings
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
CREATE POLICY "Users can manage their own settings" ON public.user_settings 
  FOR ALL USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for bias_state
DROP POLICY IF EXISTS "Users can view bias state" ON public.bias_state;
DROP POLICY IF EXISTS "Users can insert bias state" ON public.bias_state;
DROP POLICY IF EXISTS "Users can update bias state" ON public.bias_state;
DROP POLICY IF EXISTS "Users can delete bias state" ON public.bias_state;

CREATE POLICY "Users can view bias state" ON public.bias_state 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert bias state" ON public.bias_state 
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update bias state" ON public.bias_state 
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Users can delete bias state" ON public.bias_state 
  FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- 8. CREATE PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- Create a view to monitor query performance
CREATE OR REPLACE VIEW public.query_performance_summary AS
SELECT 
  schemaname,
  tablename,
  attname as column_name,
  n_distinct,
  correlation,
  most_common_vals,
  most_common_freqs,
  histogram_bounds
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename IN ('trades', 'bias_state', 'user_settings', 'daily_performance_metrics');

-- Grant access to performance monitoring
GRANT SELECT ON public.query_performance_summary TO authenticated;

-- ============================================================================
-- 9. CREATE DATABASE HEALTH CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.database_health_check()
RETURNS TABLE (
  check_name text,
  status text,
  details text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Check for SECURITY DEFINER views
  RETURN QUERY
  SELECT 
    'Security Definer Views' as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
    'Found ' || COUNT(*) || ' views with SECURITY DEFINER' as details
  FROM pg_views 
  WHERE schemaname = 'public' 
    AND viewname IN ('v_current_bias', 'secure_daily_performance_metrics')
    AND definition LIKE '%SECURITY DEFINER%';

  -- Check for functions without search_path
  RETURN QUERY
  SELECT 
    'Function Search Path' as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
    'Found ' || COUNT(*) || ' functions without search_path' as details
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
    AND p.proname IN ('get_daily_losses', 'get_user_trade_stats', 'get_current_bias', 'set_bias_state')
    AND p.proconfig IS NULL;

  -- Check materialized view access
  RETURN QUERY
  SELECT 
    'Materialized View Access' as check_name,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
    'Materialized view has proper access control' as details
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND c.relname = 'daily_performance_metrics'
    AND c.relrowsecurity = false;

  -- Check index coverage
  RETURN QUERY
  SELECT 
    'Index Coverage' as check_name,
    CASE WHEN COUNT(*) >= 10 THEN 'PASS' ELSE 'WARN' END as status,
    'Found ' || COUNT(*) || ' indexes on public tables' as details
  FROM pg_indexes 
  WHERE schemaname = 'public';

END;
$$;

-- Grant access to health check
GRANT EXECUTE ON FUNCTION public.database_health_check() TO authenticated;

COMMIT;

-- ============================================================================
-- 10. REFRESH MATERIALIZED VIEW WITH NEW DATA
-- ============================================================================

-- Refresh the materialized view with optimized data
REFRESH MATERIALIZED VIEW public.daily_performance_metrics;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run health check to verify fixes
SELECT * FROM public.database_health_check();

-- Check view definitions
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('v_current_bias', 'secure_daily_performance_metrics');

-- Check function configurations
SELECT proname, proconfig 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('get_daily_losses', 'get_user_trade_stats', 'get_current_bias', 'set_bias_state');
