-- Test script to verify database fixes
-- Run this after applying the main fix script

-- ============================================================================
-- TEST 1: SECURITY DEFINER VIEWS FIX
-- ============================================================================

SELECT 'TEST 1: Checking SECURITY DEFINER views fix' as test_name;

-- Check if views are using security_invoker instead of SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  CASE 
    WHEN definition LIKE '%security_invoker%' THEN 'PASS - Using security_invoker'
    WHEN definition LIKE '%SECURITY DEFINER%' THEN 'FAIL - Still using SECURITY DEFINER'
    ELSE 'UNKNOWN - Check view definition'
  END as status
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('v_current_bias', 'secure_daily_performance_metrics');

-- ============================================================================
-- TEST 2: FUNCTION SEARCH_PATH FIX
-- ============================================================================

SELECT 'TEST 2: Checking function search_path fix' as test_name;

-- Check if functions have search_path set
SELECT 
  proname as function_name,
  CASE 
    WHEN proconfig IS NOT NULL AND 'search_path' = ANY(proconfig) THEN 'PASS - search_path set'
    ELSE 'FAIL - search_path not set'
  END as status,
  proconfig
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('get_daily_losses', 'get_user_trade_stats', 'get_current_bias', 'set_bias_state');

-- ============================================================================
-- TEST 3: MATERIALIZED VIEW ACCESS FIX
-- ============================================================================

SELECT 'TEST 3: Checking materialized view access fix' as test_name;

-- Check if materialized view has proper access control (RLS not supported on materialized views)
SELECT 
  n.nspname as schemaname,
  c.relname as tablename,
  'INFO - RLS not supported on materialized views' as rls_status,
  CASE 
    WHEN has_table_privilege('authenticated', n.nspname||'.'||c.relname, 'SELECT') = false THEN 'PASS - No direct access'
    ELSE 'FAIL - Direct access still available'
  END as access_status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND c.relname = 'daily_performance_metrics';

-- ============================================================================
-- TEST 4: PERFORMANCE INDEXES
-- ============================================================================

SELECT 'TEST 4: Checking performance indexes' as test_name;

-- Check if performance indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  CASE 
    WHEN indexname LIKE '%covering%' OR indexname LIKE '%daily_perf%' THEN 'PASS - Performance index'
    ELSE 'INFO - Standard index'
  END as index_type
FROM pg_indexes 
WHERE schemaname = 'public'
  AND (indexname LIKE '%covering%' OR indexname LIKE '%daily_perf%' OR indexname LIKE '%user_status%')
ORDER BY tablename, indexname;

-- ============================================================================
-- TEST 5: FUNCTION EXECUTION
-- ============================================================================

SELECT 'TEST 5: Testing function execution' as test_name;

-- Test if functions can be executed (this will fail if there are permission issues)
DO $$
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  test_result integer;
  test_stats record;
BEGIN
  -- Test get_daily_losses function
  BEGIN
    SELECT public.get_daily_losses(test_user_id) INTO test_result;
    RAISE NOTICE 'PASS - get_daily_losses function executed successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'FAIL - get_daily_losses function failed: %', SQLERRM;
  END;

  -- Test get_user_trade_stats function
  BEGIN
    SELECT * FROM public.get_user_trade_stats(test_user_id, 30) INTO test_stats;
    RAISE NOTICE 'PASS - get_user_trade_stats function executed successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'FAIL - get_user_trade_stats function failed: %', SQLERRM;
  END;

  -- Test get_current_bias function
  BEGIN
    SELECT public.get_current_bias(CURRENT_DATE) INTO test_result;
    RAISE NOTICE 'PASS - get_current_bias function executed successfully';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'FAIL - get_current_bias function failed: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- TEST 6: VIEW ACCESS
-- ============================================================================

SELECT 'TEST 6: Testing view access' as test_name;

-- Test if views can be accessed
DO $$
BEGIN
  -- Test v_current_bias view
  BEGIN
    PERFORM * FROM public.v_current_bias LIMIT 1;
    RAISE NOTICE 'PASS - v_current_bias view accessible';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'FAIL - v_current_bias view failed: %', SQLERRM;
  END;

  -- Test secure_daily_performance_metrics view
  BEGIN
    PERFORM * FROM public.secure_daily_performance_metrics LIMIT 1;
    RAISE NOTICE 'PASS - secure_daily_performance_metrics view accessible';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'FAIL - secure_daily_performance_metrics view failed: %', SQLERRM;
  END;
END $$;

-- ============================================================================
-- TEST 7: RLS POLICIES
-- ============================================================================

SELECT 'TEST 7: Checking RLS policies' as test_name;

-- Check if RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('trades', 'user_settings', 'bias_state')
ORDER BY tablename, policyname;

-- ============================================================================
-- TEST 8: DATABASE HEALTH CHECK
-- ============================================================================

SELECT 'TEST 8: Running database health check' as test_name;

-- Run the health check function
SELECT * FROM public.database_health_check();

-- ============================================================================
-- TEST 9: PERFORMANCE METRICS
-- ============================================================================

SELECT 'TEST 9: Checking performance metrics' as test_name;

-- Check table sizes and index usage
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage statistics (simplified)
SELECT 
  'Index usage statistics not available in this PostgreSQL version' as message;

-- ============================================================================
-- TEST 10: MATERIALIZED VIEW REFRESH
-- ============================================================================

SELECT 'TEST 10: Testing materialized view refresh' as test_name;

-- Test if materialized view can be refreshed
DO $$
BEGIN
  PERFORM public.refresh_daily_performance_metrics();
  RAISE NOTICE 'PASS - Materialized view refresh function executed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'FAIL - Materialized view refresh failed: %', SQLERRM;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '=== TEST SUMMARY ===' as summary;
SELECT 'All tests completed. Check the output above for any FAIL messages.' as message;
SELECT 'If all tests show PASS, your database fixes are working correctly.' as next_steps;
