-- Apply only the performance optimizations
-- This script applies the database performance optimizations without conflicts

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_trades_user_status_time ON public.trades(user_id, status, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_exit_time ON public.trades(user_id, exit_time) WHERE exit_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_user_pnl ON public.trades(user_id, pnl) WHERE pnl IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_trades_user_model ON public.trades(user_id, model);
CREATE INDEX IF NOT EXISTS idx_trades_user_asset ON public.trades(user_id, asset);

-- Add partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_trades_open_trades ON public.trades(user_id, entry_time DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_trades_closed_trades ON public.trades(user_id, exit_time DESC) WHERE status = 'closed';
CREATE INDEX IF NOT EXISTS idx_trades_daily_losses ON public.trades(user_id, exit_time, pnl) 
  WHERE status = 'closed' AND exit_time IS NOT NULL AND pnl < 0;

-- Add index for bias state queries
CREATE INDEX IF NOT EXISTS idx_bias_state_day_active ON public.bias_state(day_key, active) WHERE active = true;

-- Create materialized view for daily performance metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.daily_performance_metrics AS
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

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_daily_performance_user_date ON public.daily_performance_metrics(user_id, trade_date DESC);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_daily_performance_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.daily_performance_metrics;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's daily losses efficiently
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

-- Create function to get user's trade statistics efficiently
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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_daily_losses(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_trade_stats(uuid, integer) TO authenticated;
GRANT SELECT ON public.daily_performance_metrics TO authenticated;

-- Add RLS policy for materialized view
ALTER TABLE public.daily_performance_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own daily performance" ON public.daily_performance_metrics 
  FOR SELECT USING (auth.uid() = user_id);
