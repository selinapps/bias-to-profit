-- ============================================================
-- DEBUG: Recommendation Engine Diagnostics
-- ============================================================
-- Run these queries ONE AT A TIME to find the failing component
-- ============================================================

-- ============================================================
-- TEST 1: Check if all functions exist
-- ============================================================

SELECT 
  proname as function_name,
  pg_get_functiondef(oid) LIKE '%RETURNS%' as has_returns
FROM pg_proc
WHERE proname IN (
  'get_fomo_cost_analysis',
  'get_continuation_opportunities',
  'get_confidence_calibration',
  'generate_recommendations'
)
ORDER BY proname;

-- Expected: 4 rows
-- If missing any, the migration didn't fully apply

-- ============================================================
-- TEST 2: Test FOMO Cost Analysis (individually)
-- ============================================================

SELECT * FROM get_fomo_cost_analysis(auth.uid());

-- Expected: Array of discipline tags with costs (or empty array)
-- If error: Note the exact error message

-- ============================================================
-- TEST 3: Test Continuation Opportunities (individually)
-- ============================================================

SELECT * FROM get_continuation_opportunities(auth.uid());

-- Expected: Array of setups with continuation data (or empty array)
-- If error: Note the exact error message

-- ============================================================
-- TEST 4: Test Confidence Calibration (individually)
-- ============================================================

SELECT * FROM get_confidence_calibration(auth.uid());

-- Expected: Array of confidence levels with calibration (or empty array)
-- If error: Note the exact error message

-- ============================================================
-- TEST 5: Check if recommendations table exists
-- ============================================================

SELECT COUNT(*) as table_exists
FROM information_schema.tables
WHERE table_name = 'recommendations';

-- Expected: 1
-- If 0: Table wasn't created

-- ============================================================
-- TEST 6: Try simple insert to recommendations table
-- ============================================================

INSERT INTO recommendations (
  user_id, category, priority, title, description
) VALUES (
  auth.uid(),
  'test',
  'low',
  'Test Recommendation',
  'This is a test to verify table works'
) RETURNING id;

-- Expected: Returns an ID
-- If error: Table has constraint issues

-- Clean up test
DELETE FROM recommendations WHERE category = 'test';

-- ============================================================
-- TEST 7: Test generate_recommendations with verbose errors
-- ============================================================

-- This will show any warnings in PostgreSQL logs
DO $$
DECLARE
  rec_count integer;
BEGIN
  RAISE NOTICE 'Starting recommendation generation...';
  rec_count := generate_recommendations(auth.uid());
  RAISE NOTICE 'Generated % recommendations', rec_count;
END $$;

-- Check PostgreSQL logs for WARNINGS if count is 0

-- ============================================================
-- COMMON ERRORS & FIXES
-- ============================================================

-- ERROR: column "discipline_tag" does not exist
-- FIX: The trades table might not have discipline_tag column
-- Check: SELECT column_name FROM information_schema.columns 
--        WHERE table_name = 'trades' AND column_name = 'discipline_tag';

-- ERROR: function get_continuation_by_setup does not exist
-- FIX: Phase 2B migration wasn't applied
-- Apply: migrations/create_views_phase2b.sql

-- ERROR: relation "post_trade_observations" does not exist
-- FIX: Phase 2 migration wasn't applied
-- Apply: migrations/add_post_trade_observations.sql

-- ERROR: column "confidence" does not exist
-- FIX: Phase 1 migration wasn't applied
-- Apply: migrations/complete_trades_schema_remap.sql

