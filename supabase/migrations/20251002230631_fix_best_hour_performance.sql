-- Fix best hour performance to track actual trade time (exit_time) instead of entry time
-- This addresses the user's request to track when trades were actually closed

-- 1. Fix the best trading hours function to use exit_time
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
    EXTRACT(hour FROM COALESCE(exit_time, entry_time))::integer as hour_of_day,
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
    AND COALESCE(exit_time, entry_time) >= CURRENT_DATE - INTERVAL '1 day' * p_days
  GROUP BY EXTRACT(hour FROM COALESCE(exit_time, entry_time))
  HAVING COUNT(*) > 0
  ORDER BY total_pnl DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the materialized view to use exit_time for better accuracy
DROP MATERIALIZED VIEW IF EXISTS public.daily_performance_metrics CASCADE;

CREATE MATERIALIZED VIEW public.daily_performance_metrics AS
SELECT 
  user_id,
  DATE(COALESCE(exit_time, entry_time)) as trade_date,
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
GROUP BY user_id, DATE(COALESCE(exit_time, entry_time));

-- 3. Recreate the secure view
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

-- 4. Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_daily_performance_user_date ON public.daily_performance_metrics(user_id, trade_date DESC);

-- 5. Refresh the materialized view with new data
REFRESH MATERIALIZED VIEW public.daily_performance_metrics;
