-- Manual Index Creation (Alternative to concurrent indexes)
-- Use this if CREATE INDEX CONCURRENTLY continues to fail

-- ============================================================================
-- MANUAL INDEX CREATION (NON-CONCURRENT)
-- ============================================================================

-- Create covering indexes for common queries (without CONCURRENTLY)
CREATE INDEX IF NOT EXISTS idx_trades_user_status_covering 
ON public.trades(user_id, status, entry_time DESC) 
INCLUDE (asset, direction, model, pnl, r_multiple, exit_time);

CREATE INDEX IF NOT EXISTS idx_trades_daily_perf_covering 
ON public.trades(user_id, entry_time, status) 
INCLUDE (pnl, r_multiple, model, exit_time);

CREATE INDEX IF NOT EXISTS idx_bias_state_latest_active 
ON public.bias_state(day_key, active, selected_at DESC) 
WHERE active = true;

-- Create additional performance indexes
CREATE INDEX IF NOT EXISTS idx_trades_user_date_status 
ON public.trades(user_id, entry_time, status);

CREATE INDEX IF NOT EXISTS idx_trades_user_exit_date_pnl 
ON public.trades(user_id, exit_time, pnl) 
WHERE exit_time IS NOT NULL AND pnl IS NOT NULL;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that indexes were created successfully
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

SELECT 'Manual indexes created successfully!' as status;
