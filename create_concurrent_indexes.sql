-- Create Concurrent Indexes (Run this separately after apply_complete_database_fix.sql)
-- This script creates performance indexes that must be run outside transaction blocks

-- ============================================================================
-- SAFETY CHECK - ENSURE NO OPEN TRANSACTIONS
-- ============================================================================

-- Check if we're in a transaction block
DO $$
BEGIN
  -- This will fail if we're in a transaction block
  IF txid_current() IS NOT NULL THEN
    RAISE NOTICE 'Starting concurrent index creation...';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Warning: Transaction detected. Please ensure no transactions are open.';
END $$;

-- ============================================================================
-- CONCURRENT INDEX CREATION
-- ============================================================================

-- Create covering indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_status_covering 
ON public.trades(user_id, status, entry_time DESC) 
INCLUDE (asset, direction, model, pnl, r_multiple, exit_time);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_daily_perf_covering 
ON public.trades(user_id, entry_time, status) 
INCLUDE (pnl, r_multiple, model, exit_time);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bias_state_latest_active 
ON public.bias_state(day_key, active, selected_at DESC) 
WHERE active = true;

-- Create additional performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_date_status 
ON public.trades(user_id, entry_time, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_user_exit_date_pnl 
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

SELECT 'Concurrent indexes created successfully!' as status;
