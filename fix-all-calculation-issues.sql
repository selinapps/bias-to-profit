-- COMPREHENSIVE FIX FOR ALL CALCULATION ISSUES
-- This script fixes all the calculation problems in the dashboard

-- 1. Fix the daily losses function to use entry_time consistently
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

-- 2. Create a comprehensive function to get today's performance
CREATE OR REPLACE FUNCTION public.get_today_performance(p_user_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_trades bigint,
  wins bigint,
  losses bigint,
  total_pnl numeric,
  total_r_multiple numeric,
  win_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_trades,
    COUNT(CASE WHEN pnl > 0 THEN 1 END) as wins,
    COUNT(CASE WHEN pnl < 0 THEN 1 END) as losses,
    COALESCE(SUM(pnl), 0) as total_pnl,
    COALESCE(SUM(r_multiple), 0) as total_r_multiple,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(CASE WHEN pnl > 0 THEN 1 END)::numeric / COUNT(*)::numeric) * 100
      ELSE 0 
    END as win_rate
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND DATE(entry_time) = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to get model performance accurately
CREATE OR REPLACE FUNCTION public.get_model_performance(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (
  model text,
  total_trades bigint,
  wins bigint,
  losses bigint,
  total_pnl numeric,
  win_rate numeric,
  avg_r_multiple numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.model,
    COUNT(*) as total_trades,
    COUNT(CASE WHEN pnl > 0 THEN 1 END) as wins,
    COUNT(CASE WHEN pnl < 0 THEN 1 END) as losses,
    COALESCE(SUM(pnl), 0) as total_pnl,
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(CASE WHEN pnl > 0 THEN 1 END)::numeric / COUNT(*)::numeric) * 100
      ELSE 0 
    END as win_rate,
    COALESCE(AVG(r_multiple), 0) as avg_r_multiple
  FROM public.trades t
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= CURRENT_DATE - INTERVAL '1 day' * p_days
  GROUP BY t.model
  ORDER BY total_pnl DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix the materialized view to use entry_time consistently
-- First drop the dependent view, then the materialized view
DROP VIEW IF EXISTS public.secure_daily_performance_metrics CASCADE;
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

-- 5. Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_daily_performance_user_date ON public.daily_performance_metrics(user_id, trade_date DESC);

-- 5a. Recreate the secure view that depends on the materialized view
CREATE VIEW public.secure_daily_performance_metrics AS
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

-- 6. Create function to get best trading hours (fixed)
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

-- 7. Create function to get weekly summary (fixed)
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

-- 8. Create function to get daily performance (fixed)
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

-- 9. Grant permissions for all functions
GRANT EXECUTE ON FUNCTION public.get_daily_losses(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_performance(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_model_performance(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_best_trading_hours(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_summary(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_performance(uuid, integer) TO authenticated;
GRANT SELECT ON public.daily_performance_metrics TO authenticated;
GRANT SELECT ON public.secure_daily_performance_metrics TO authenticated;

-- 10. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_entry_time_status ON public.trades(user_id, entry_time DESC) WHERE status = 'closed';
CREATE INDEX IF NOT EXISTS idx_trades_user_status_entry_time ON public.trades(user_id, status, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_model_status ON public.trades(user_id, model, status) WHERE status = 'closed';

-- 11. Create trigger to auto-refresh materialized view
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

-- 12. Create function to manually refresh all performance data
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

-- 13. Add comments explaining the fixes
COMMENT ON FUNCTION public.get_daily_losses(uuid, date) IS 'FIXED: Uses entry_time for consistent daily calculations';
COMMENT ON FUNCTION public.get_today_performance(uuid, date) IS 'NEW: Comprehensive today performance calculation';
COMMENT ON FUNCTION public.get_model_performance(uuid, integer) IS 'NEW: Accurate model performance comparison';
COMMENT ON FUNCTION public.get_best_trading_hours(uuid, integer) IS 'FIXED: Best trading hours calculation';
COMMENT ON FUNCTION public.get_weekly_summary(uuid, integer) IS 'FIXED: Weekly performance summary';
COMMENT ON FUNCTION public.get_daily_performance(uuid, integer) IS 'FIXED: Daily performance metrics';

-- 14. Refresh the materialized view with correct data
REFRESH MATERIALIZED VIEW public.daily_performance_metrics;
