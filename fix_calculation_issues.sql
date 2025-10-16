-- Fix calculation issues in dashboard and analytics
-- This migration addresses the calculation problems reported by the user

-- 1. Fix daily losses function to use entry_time instead of exit_time
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

-- 2. Refresh materialized view to ensure consistency
REFRESH MATERIALIZED VIEW public.daily_performance_metrics;

-- 3. Create function to get best trading hours
CREATE OR REPLACE FUNCTION public.get_best_trading_hours(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (
  hour_of_day integer,
  total_pnl numeric,
  trade_count bigint,
  win_rate numeric,
  avg_r_multiple numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(hour FROM entry_time)::integer as hour_of_day,
    COALESCE(SUM(pnl), 0) as total_pnl,
    COUNT(*) as trade_count,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(CASE WHEN pnl > 0 THEN 1 END)::numeric / COUNT(*)::numeric) * 100
      ELSE 0 
    END as win_rate,
    COALESCE(AVG(r_multiple), 0) as avg_r_multiple
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= CURRENT_DATE - INTERVAL '1 day' * p_days
  GROUP BY EXTRACT(hour FROM entry_time)
  HAVING COUNT(*) > 0
  ORDER BY total_pnl DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to get weekly summary with correct calculations
CREATE OR REPLACE FUNCTION public.get_weekly_summary(p_user_id uuid, p_weeks integer DEFAULT 12)
RETURNS TABLE (
  week_start date,
  week_end date,
  total_pnl numeric,
  trade_count bigint,
  trading_days bigint,
  win_rate numeric,
  avg_r_multiple numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('week', entry_time)::date as week_start,
    (DATE_TRUNC('week', entry_time) + INTERVAL '6 days')::date as week_end,
    COALESCE(SUM(pnl), 0) as total_pnl,
    COUNT(*) as trade_count,
    COUNT(DISTINCT DATE(entry_time)) as trading_days,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(CASE WHEN pnl > 0 THEN 1 END)::numeric / COUNT(*)::numeric) * 100
      ELSE 0 
    END as win_rate,
    COALESCE(AVG(r_multiple), 0) as avg_r_multiple
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= CURRENT_DATE - INTERVAL '1 week' * p_weeks
  GROUP BY DATE_TRUNC('week', entry_time)
  ORDER BY week_start DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get daily performance with correct date filtering
CREATE OR REPLACE FUNCTION public.get_daily_performance(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (
  trade_date date,
  total_pnl numeric,
  trade_count bigint,
  wins bigint,
  losses bigint,
  win_rate numeric,
  avg_r_multiple numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(entry_time) as trade_date,
    COALESCE(SUM(pnl), 0) as total_pnl,
    COUNT(*) as trade_count,
    COUNT(CASE WHEN pnl > 0 THEN 1 END) as wins,
    COUNT(CASE WHEN pnl < 0 THEN 1 END) as losses,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(CASE WHEN pnl > 0 THEN 1 END)::numeric / COUNT(*)::numeric) * 100
      ELSE 0 
    END as win_rate,
    COALESCE(AVG(r_multiple), 0) as avg_r_multiple
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= CURRENT_DATE - INTERVAL '1 day' * p_days
  GROUP BY DATE(entry_time)
  ORDER BY trade_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions for new functions
GRANT EXECUTE ON FUNCTION public.get_best_trading_hours(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_summary(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_performance(uuid, integer) TO authenticated;

-- 7. Add indexes for better performance on time-based queries
-- Using simpler indexes to avoid immutable function issues
CREATE INDEX IF NOT EXISTS idx_trades_user_entry_time_status ON public.trades(user_id, entry_time DESC) WHERE status = 'closed';
CREATE INDEX IF NOT EXISTS idx_trades_user_status_entry_time ON public.trades(user_id, status, entry_time DESC);

-- 8. Create a trigger to auto-refresh materialized view when trades change
CREATE OR REPLACE FUNCTION public.trigger_refresh_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh materialized view in the background
  PERFORM pg_notify('refresh_performance_metrics', '');
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_trades_performance_refresh ON public.trades;

-- Create new trigger
CREATE TRIGGER trigger_trades_performance_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_refresh_performance_metrics();

-- 9. Create a function to manually refresh all performance data
CREATE OR REPLACE FUNCTION public.refresh_all_performance_data()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.daily_performance_metrics;
  -- Log the refresh
  RAISE NOTICE 'Performance data refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permission for manual refresh
GRANT EXECUTE ON FUNCTION public.refresh_all_performance_data() TO authenticated;

-- 10. Add comment explaining the fixes
COMMENT ON FUNCTION public.get_daily_losses(uuid, date) IS 'Fixed: Now uses entry_time instead of exit_time for consistent daily calculations';
COMMENT ON FUNCTION public.get_best_trading_hours(uuid, integer) IS 'New: Calculates best trading hours based on historical performance';
COMMENT ON FUNCTION public.get_weekly_summary(uuid, integer) IS 'New: Provides accurate weekly performance summary';
COMMENT ON FUNCTION public.get_daily_performance(uuid, integer) IS 'New: Provides accurate daily performance metrics';
