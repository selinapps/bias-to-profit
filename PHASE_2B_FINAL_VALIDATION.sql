-- ============================================================
-- PHASE 2B FINAL VALIDATION CHECKLIST
-- ============================================================
-- Run all these queries to verify deployment
-- Expected: All return results without errors
-- ============================================================

-- ============================================================
-- TEST 1-2: Views Exist and Work
-- ============================================================

-- Test 1: v_trades_analytics
SELECT 
  id, 
  setup_name, 
  r_multiple, 
  mfe_r, 
  efficiency, 
  efficiency_safe, 
  risk_efficiency,
  capture_percentage
FROM v_trades_analytics
WHERE user_id = auth.uid()
LIMIT 5;
-- Expected: Returns rows (or empty), efficiency_safe NULL when mfe_r <= 0

-- Test 2: v_trade_observations
SELECT 
  trade_id, 
  setup_name, 
  session,
  observation_type, 
  price_action, 
  r_moved, 
  observation_insight
FROM v_trade_observations
WHERE user_id = auth.uid()
LIMIT 5;
-- Expected: Returns joined rows (or empty), no errors

-- ============================================================
-- TEST 3-11: All RPC Functions Return Data
-- ============================================================

-- Test 3: Observation summary
SELECT * FROM get_observation_summary(auth.uid());
-- Expected: 1 row with zeros/nulls (not error)

-- Test 4: Continuation by setup
SELECT * FROM get_continuation_by_setup(auth.uid());
-- Expected: Empty array [] (not error)

-- Test 5: Reversal after stop
SELECT * FROM get_reversal_after_stop_by_setup(auth.uid());
-- Expected: Empty array [] (not error)

-- Test 6: Optimal window
SELECT * FROM get_optimal_observation_window(auth.uid());
-- Expected: Empty array [] (not error)

-- Test 7: Exit quality
SELECT * FROM get_exit_quality_by_setup(auth.uid());
-- Expected: Empty array [] (not error)

-- Test 8: Missed R timeline
SELECT * FROM get_missed_r_timeline(auth.uid(), 30);
-- Expected: Empty array [] (not error)

-- Test 9: Confidence performance
SELECT * FROM get_confidence_performance(auth.uid());
-- Expected: Empty array [] (not error)

-- Test 10: Discipline performance
SELECT * FROM get_discipline_performance(auth.uid());
-- Expected: Empty array [] (not error)

-- Test 11: Efficiency by setup
SELECT * FROM get_efficiency_by_setup(auth.uid());
-- Expected: Empty array [] (not error)

-- ============================================================
-- TEST 12: NULL Safety - Division by Zero Prevention
-- ============================================================

-- Verify efficiency_safe is NULL when mfe_r is NULL or <= 0
SELECT 
  id,
  r_multiple,
  mfe_r,
  efficiency,
  efficiency_safe,
  CASE 
    WHEN mfe_r IS NULL OR mfe_r <= 0 THEN 'Should be NULL'
    ELSE 'Should have value'
  END as expected_state,
  CASE
    WHEN efficiency_safe IS NULL AND (mfe_r IS NULL OR mfe_r <= 0) THEN '✓ PASS'
    WHEN efficiency_safe IS NOT NULL AND mfe_r > 0 THEN '✓ PASS'
    ELSE '✗ FAIL'
  END as test_result
FROM v_trades_analytics
WHERE user_id = auth.uid()
LIMIT 10;
-- Expected: test_result column shows all '✓ PASS'

-- ============================================================
-- TEST 13: RLS Security Check
-- ============================================================

-- Verify RLS prevents seeing other users' data
SELECT COUNT(*) as my_observations
FROM post_trade_observations
WHERE user_id = auth.uid();
-- Expected: Returns your count only

SELECT COUNT(*) as view_observations  
FROM v_trade_observations
WHERE user_id = auth.uid();
-- Expected: Same count as above (or 0)

-- ============================================================
-- TEST 14: Index Usage Check
-- ============================================================

-- Verify indexes exist
SELECT 
  tablename, 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('trades', 'post_trade_observations')
  AND (
    indexname LIKE '%setup_name%' OR
    indexname LIKE '%efficiency%' OR
    indexname LIKE '%trade_id%' OR
    indexname LIKE '%observation_type%'
  )
ORDER BY tablename, indexname;
-- Expected: Shows relevant indexes

-- ============================================================
-- TEST 15: Performance Check
-- ============================================================

EXPLAIN ANALYZE
SELECT * FROM get_continuation_by_setup(auth.uid());
-- Expected: Execution time < 100ms, uses indexes

EXPLAIN ANALYZE
SELECT * FROM v_trades_analytics WHERE user_id = auth.uid() LIMIT 100;
-- Expected: Uses idx_trades_user_id index

-- ============================================================
-- TEST 16: Data Accuracy Verification
-- ============================================================

-- If you have trades with efficiency data, verify calculation
SELECT 
  id,
  r_multiple,
  mfe_r,
  efficiency_safe as calculated,
  LEAST(1.0, ABS(r_multiple / NULLIF(mfe_r, 0))) as manual_calc,
  ABS(efficiency_safe - LEAST(1.0, ABS(r_multiple / NULLIF(mfe_r, 0)))) as difference
FROM v_trades_analytics
WHERE user_id = auth.uid()
  AND mfe_r > 0
  AND efficiency_safe IS NOT NULL
LIMIT 5;
-- Expected: difference < 0.001 (match)

-- ============================================================
-- TEST 17: Setup Name Migration Check
-- ============================================================

-- Verify setup_name is populated from locations migration
SELECT 
  id,
  setup_name,
  locations,
  CASE 
    WHEN setup_name IS NOT NULL THEN '✓ Has setup_name'
    WHEN locations IS NOT NULL AND array_length(locations, 1) > 0 THEN '⚠ Has locations only'
    ELSE '✗ Missing both'
  END as migration_status
FROM trades
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
-- Expected: Newer trades have setup_name, old trades have locations

-- ============================================================
-- TEST 18: Empty State Handling
-- ============================================================

-- Functions should return proper empty states
SELECT 
  'observation_summary' as func,
  (SELECT COUNT(*) FROM get_observation_summary(auth.uid())) as row_count,
  (SELECT total_observations FROM get_observation_summary(auth.uid())) as total_obs;
-- Expected: row_count = 1, total_obs = 0 (not NULL, not error)

-- ============================================================
-- TEST 19: Backward Compatibility
-- ============================================================

-- Old trades without new fields should still work
SELECT COUNT(*) as trades_with_old_schema
FROM trades
WHERE user_id = auth.uid()
  AND (
    confidence IS NULL OR
    discipline_tag IS NULL OR
    mae_r IS NULL OR
    efficiency IS NULL
  );
-- Expected: Returns count (not error), old trades still queryable

-- ============================================================
-- TEST 20: Export Sample Dataset for Phase 2C
-- ============================================================

-- Export 10 trades with all Phase 1/2 fields
SELECT json_agg(row_to_json(t))
FROM (
  SELECT 
    id, asset, setup_name, session, direction,
    entry_time, exit_time, entry_price, exit_price,
    pnl, r_multiple, efficiency, mae_r, mfe_r,
    confidence, discipline_tag, checklist_passed,
    moved_to_be, be_trigger_r, exit_reason,
    risk_amount, lot_size
  FROM v_trades_analytics
  WHERE user_id = auth.uid()
    AND status = 'closed'
  ORDER BY exit_time DESC
  LIMIT 10
) t;
-- Copy this JSON for Phase 2C chart testing

-- ============================================================
-- TEST 21: Export 5 Observations
-- ============================================================

SELECT json_agg(row_to_json(o))
FROM (
  SELECT 
    trade_id, asset, setup_name, session,
    observation_type, observation_time, price_action,
    peak_price, pips_moved, r_moved,
    observation_insight, observed_at
  FROM v_trade_observations
  WHERE user_id = auth.uid()
  ORDER BY observed_at DESC
  LIMIT 5
) o;
-- Copy this JSON for observation chart testing

-- ============================================================
-- TEST 22: Function Performance Baseline
-- ============================================================

-- Time all analytics functions (should be < 100ms each)
\timing on

SELECT * FROM get_efficiency_by_setup(auth.uid());
SELECT * FROM get_confidence_performance(auth.uid());
SELECT * FROM get_discipline_performance(auth.uid());
SELECT * FROM get_continuation_by_setup(auth.uid());
SELECT * FROM get_reversal_after_stop_by_setup(auth.uid());

\timing off

-- ============================================================
-- VALIDATION COMPLETE
-- ============================================================

-- Summary query - Run this last
SELECT 
  'Phase 2B Validation Summary' as report,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_name IN ('v_trades_analytics', 'v_trade_observations')) as views_created,
  (SELECT COUNT(*) FROM pg_proc WHERE proname LIKE 'get_%performance' OR proname LIKE 'get_%by_setup' OR proname LIKE 'get_observation%' OR proname LIKE 'get_optimal%' OR proname LIKE 'get_exit_quality%' OR proname LIKE 'get_missed%') as functions_created,
  (SELECT COUNT(*) FROM trades WHERE user_id = auth.uid()) as total_trades,
  (SELECT COUNT(*) FROM post_trade_observations WHERE user_id = auth.uid()) as total_observations,
  (SELECT COUNT(*) FROM trades WHERE user_id = auth.uid() AND confidence IS NOT NULL) as trades_with_confidence,
  (SELECT COUNT(*) FROM trades WHERE user_id = auth.uid() AND discipline_tag IS NOT NULL) as trades_with_discipline,
  (SELECT COUNT(*) FROM trades WHERE user_id = auth.uid() AND efficiency IS NOT NULL) as trades_with_efficiency;

-- Expected results:
-- views_created: 2
-- functions_created: 9
-- Other counts: Your actual data

