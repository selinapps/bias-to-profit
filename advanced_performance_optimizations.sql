-- Advanced Performance Optimizations
-- Based on query analysis and performance bottlenecks

BEGIN;

-- ============================================================================
-- 1. OPTIMIZE FREQUENTLY EXECUTED QUERIES
-- ============================================================================

-- Create specialized indexes for the most frequent query patterns
-- Based on the query analysis, these are the most expensive queries
-- Note: Concurrent indexes will be created outside transaction blocks

-- ============================================================================
-- 2. OPTIMIZE TRADES TABLE QUERIES
-- ============================================================================

-- Create covering indexes for common trade queries
-- Note: These will be created outside transaction blocks

-- ============================================================================
-- 3. OPTIMIZE MATERIALIZED VIEW REFRESH
-- ============================================================================

-- Create a more efficient materialized view with better indexing
DROP MATERIALIZED VIEW IF EXISTS public.daily_performance_metrics CASCADE;

CREATE MATERIALIZED VIEW public.daily_performance_metrics AS
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

-- Create optimized indexes on materialized view
CREATE UNIQUE INDEX idx_daily_performance_user_date_unique 
ON public.daily_performance_metrics(user_id, trade_date);

CREATE INDEX idx_daily_performance_trade_date_desc 
ON public.daily_performance_metrics(trade_date DESC);

CREATE INDEX idx_daily_performance_user_pnl 
ON public.daily_performance_metrics(user_id, total_pnl DESC);

-- ============================================================================
-- 4. CREATE PARTITIONED TABLES FOR BETTER PERFORMANCE
-- ============================================================================

-- Create a partitioned trades table for better performance with large datasets
-- This is optional and only needed if you have millions of trades

-- Create monthly partitions for trades (uncomment if needed)
-- CREATE TABLE public.trades_y2024m01 PARTITION OF public.trades
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- ============================================================================
-- 5. OPTIMIZE FUNCTION PERFORMANCE
-- ============================================================================

-- Create optimized version of get_user_trade_stats with better performance
CREATE OR REPLACE FUNCTION public.get_user_trade_stats_optimized(p_user_id uuid, p_days integer DEFAULT 30)
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
  WITH trade_stats AS (
    SELECT 
      COUNT(*) as total_trades,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_trades,
      COUNT(CASE WHEN status = 'open' THEN 1 END) as open_trades,
      COUNT(CASE WHEN status = 'closed' AND pnl > 0 THEN 1 END) as winning_trades,
      COUNT(CASE WHEN status = 'closed' AND pnl < 0 THEN 1 END) as losing_trades,
      COALESCE(SUM(CASE WHEN status = 'closed' THEN pnl END), 0) as total_pnl,
      COALESCE(AVG(CASE WHEN status = 'closed' THEN pnl END), 0) as avg_pnl,
      COALESCE(AVG(CASE WHEN status = 'closed' THEN r_multiple END), 0) as avg_r_multiple,
      COUNT(CASE WHEN model = 'trend' AND status = 'closed' THEN 1 END) as trend_trades,
      COUNT(CASE WHEN model = 'mean_reversion' AND status = 'closed' THEN 1 END) as mr_trades,
      COALESCE(SUM(CASE WHEN model = 'trend' AND status = 'closed' THEN pnl END), 0) as trend_pnl,
      COALESCE(SUM(CASE WHEN model = 'mean_reversion' AND status = 'closed' THEN pnl END), 0) as mr_pnl
    FROM public.trades
    WHERE user_id = p_user_id
      AND entry_time >= CURRENT_DATE - INTERVAL '1 day' * p_days
  )
  SELECT 
    ts.total_trades,
    ts.closed_trades,
    ts.open_trades,
    ts.winning_trades,
    ts.losing_trades,
    ts.total_pnl,
    ts.avg_pnl,
    CASE 
      WHEN ts.closed_trades > 0 
      THEN (ts.winning_trades::numeric / ts.closed_trades::numeric) * 100
      ELSE 0 
    END as win_rate,
    ts.avg_r_multiple,
    ts.trend_trades,
    ts.mr_trades,
    ts.trend_pnl,
    ts.mr_pnl
  FROM trade_stats ts;
END;
$$;

-- ============================================================================
-- 6. CREATE CACHING MECHANISMS
-- ============================================================================

-- Create a function to cache frequently accessed data
CREATE OR REPLACE FUNCTION public.get_cached_user_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  cached_stats jsonb;
  cache_key text;
BEGIN
  cache_key := 'user_stats_' || p_user_id::text;
  
  -- Try to get from cache (you can implement Redis or similar here)
  -- For now, we'll just return the computed stats
  SELECT to_jsonb(stats) INTO cached_stats
  FROM (
    SELECT * FROM public.get_user_trade_stats_optimized(p_user_id, 30)
  ) stats;
  
  RETURN cached_stats;
END;
$$;

-- ============================================================================
-- 7. CREATE PERFORMANCE MONITORING
-- ============================================================================

-- Create a view to monitor slow queries
CREATE OR REPLACE VIEW public.slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows,
  cache_hit_rate
FROM pg_stat_statements 
WHERE mean_time > 100  -- Queries taking more than 100ms on average
ORDER BY mean_time DESC;

-- Create a function to analyze table bloat
CREATE OR REPLACE FUNCTION public.analyze_table_bloat()
RETURNS TABLE (
  table_name text,
  table_size text,
  index_size text,
  bloat_ratio numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
    ROUND(
      (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename))::numeric / 
      pg_total_relation_size(schemaname||'.'||tablename)::numeric * 100, 2
    ) as bloat_ratio
  FROM pg_tables 
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$;

-- ============================================================================
-- 8. CREATE AUTOMATED MAINTENANCE FUNCTIONS
-- ============================================================================

-- Create function to automatically refresh materialized views
CREATE OR REPLACE FUNCTION public.auto_refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Refresh materialized views during low-traffic hours
  IF EXTRACT(HOUR FROM NOW()) BETWEEN 2 AND 4 THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_performance_metrics;
  END IF;
END;
$$;

-- Create function to clean up old data
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Clean up old bias_state entries (keep last 90 days)
  DELETE FROM public.bias_state 
  WHERE day_key < CURRENT_DATE - INTERVAL '90 days'
    AND active = false;
    
  -- Clean up old trades (keep last 2 years)
  DELETE FROM public.trades 
  WHERE entry_time < CURRENT_DATE - INTERVAL '2 years'
    AND status = 'closed';
END;
$$;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION public.get_user_trade_stats_optimized(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cached_user_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.analyze_table_bloat() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_refresh_materialized_views() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_data() TO authenticated;

-- Grant view permissions
GRANT SELECT ON public.slow_queries TO authenticated;

-- ============================================================================
-- 10. CREATE SCHEDULED JOBS (if using pg_cron)
-- ============================================================================

-- Schedule automatic maintenance (uncomment if pg_cron is available)
-- SELECT cron.schedule('refresh-materialized-views', '0 3 * * *', 'SELECT public.auto_refresh_materialized_views();');
-- SELECT cron.schedule('cleanup-old-data', '0 4 * * 0', 'SELECT public.cleanup_old_data();');

COMMIT;

-- ============================================================================
-- CONCURRENT INDEX CREATION (OUTSIDE TRANSACTIONS)
-- ============================================================================

-- Create specialized indexes for the most frequent query patterns
-- Index for realtime subscription queries (most frequent)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_realtime_subscription_entity 
ON realtime.subscription(entity) 
WHERE entity IS NOT NULL;

-- Index for pg_timezone_names queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pg_timezone_names_name 
ON pg_timezone_names(name);

-- Index for function metadata queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pg_proc_namespace_kind 
ON pg_proc(pronamespace, prokind) 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Create covering indexes for common trade queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_status_covering 
ON public.trades(user_id, status, entry_time DESC) 
INCLUDE (asset, direction, model, pnl, r_multiple, exit_time);

-- Create index for daily performance calculations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_daily_perf_covering 
ON public.trades(user_id, DATE(entry_time), status) 
INCLUDE (pnl, r_multiple, model, exit_time);

-- Create index for bias state queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bias_state_latest_active 
ON public.bias_state(day_key, active, selected_at DESC) 
WHERE active = true;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
