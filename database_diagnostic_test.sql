-- DATABASE DIAGNOSTIC TEST SCRIPT
-- Run this in Supabase SQL Editor to identify all database issues

-- ============================================================================
-- TEST 1: CHECK IF ALL REQUIRED TABLES EXIST
-- ============================================================================

SELECT '=== TABLE EXISTENCE CHECK ===' as test_section;

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN tablename IN ('profiles', 'trades', 'bias_state', 'user_settings', 'daily_session_patterns') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'trades', 'bias_state', 'user_settings', 'daily_session_patterns')
ORDER BY tablename;

-- Show all public tables
SELECT 'All public tables:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- ============================================================================
-- TEST 2: CHECK TABLE STRUCTURES
-- ============================================================================

SELECT '=== TABLE STRUCTURE CHECK ===' as test_section;

-- Check profiles table structure
SELECT 'Profiles table structure:' as table_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check user_settings table structure  
SELECT 'User_settings table structure:' as table_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_settings'
ORDER BY ordinal_position;

-- Check daily_session_patterns table structure
SELECT 'Daily_session_patterns table structure:' as table_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'daily_session_patterns'
ORDER BY ordinal_position;

-- Check bias_state table structure
SELECT 'Bias_state table structure:' as table_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'bias_state'
ORDER BY ordinal_position;

-- Check trades table structure
SELECT 'Trades table structure:' as table_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'trades'
ORDER BY ordinal_position;

-- ============================================================================
-- TEST 3: CHECK ROW LEVEL SECURITY
-- ============================================================================

SELECT '=== ROW LEVEL SECURITY CHECK ===' as test_section;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ENABLED' 
    ELSE '❌ RLS DISABLED' 
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'trades', 'bias_state', 'user_settings', 'daily_session_patterns')
ORDER BY tablename;

-- ============================================================================
-- TEST 4: CHECK RLS POLICIES
-- ============================================================================

SELECT '=== RLS POLICIES CHECK ===' as test_section;

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
  AND tablename IN ('profiles', 'trades', 'bias_state', 'user_settings', 'daily_session_patterns')
ORDER BY tablename, policyname;

-- ============================================================================
-- TEST 5: CHECK VIEWS
-- ============================================================================

SELECT '=== VIEWS CHECK ===' as test_section;

SELECT 
  schemaname,
  viewname,
  CASE 
    WHEN viewname IN ('v_current_bias', 'secure_daily_performance_metrics', 'v_current_session_pattern') 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('v_current_bias', 'secure_daily_performance_metrics', 'v_current_session_pattern')
ORDER BY viewname;

-- ============================================================================
-- TEST 6: CHECK FUNCTIONS
-- ============================================================================

SELECT '=== FUNCTIONS CHECK ===' as test_section;

SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  pg_get_function_arguments(p.oid) as arguments,
  p.proconfig as function_config,
  CASE 
    WHEN p.proconfig IS NOT NULL THEN '✅ HAS CONFIG'
    ELSE '❌ NO CONFIG'
  END as config_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('get_current_bias', 'set_bias_state', 'update_updated_at_column', 'infer_session_scenario', 'update_session_scenario')
ORDER BY p.proname;

-- ============================================================================
-- TEST 7: CHECK INDEXES
-- ============================================================================

SELECT '=== INDEXES CHECK ===' as test_section;

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'trades', 'bias_state', 'user_settings', 'daily_session_patterns')
ORDER BY tablename, indexname;

-- ============================================================================
-- TEST 8: CHECK ENUMS
-- ============================================================================

SELECT '=== ENUMS CHECK ===' as test_section;

SELECT 
  n.nspname as schema_name,
  t.typname as enum_name,
  array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname IN ('session_behavior', 'session_scenario', 'bias_enum', 'market_state_enum')
GROUP BY n.nspname, t.typname
ORDER BY t.typname;

-- ============================================================================
-- TEST 9: CHECK PERMISSIONS
-- ============================================================================

SELECT '=== PERMISSIONS CHECK ===' as test_section;

-- Check table permissions
SELECT 
  schemaname,
  tablename,
  tableowner,
  CASE 
    WHEN has_table_privilege('authenticated', schemaname||'.'||tablename, 'SELECT') THEN '✅ SELECT'
    ELSE '❌ NO SELECT'
  END as select_permission,
  CASE 
    WHEN has_table_privilege('authenticated', schemaname||'.'||tablename, 'INSERT') THEN '✅ INSERT'
    ELSE '❌ NO INSERT'
  END as insert_permission,
  CASE 
    WHEN has_table_privilege('authenticated', schemaname||'.'||tablename, 'UPDATE') THEN '✅ UPDATE'
    ELSE '❌ NO UPDATE'
  END as update_permission,
  CASE 
    WHEN has_table_privilege('authenticated', schemaname||'.'||tablename, 'DELETE') THEN '✅ DELETE'
    ELSE '❌ NO DELETE'
  END as delete_permission
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'trades', 'bias_state', 'user_settings', 'daily_session_patterns')
ORDER BY tablename;

-- ============================================================================
-- TEST 10: SIMULATE APPLICATION QUERIES
-- ============================================================================

SELECT '=== APPLICATION QUERY SIMULATION ===' as test_section;

-- Test profiles query (this is what's failing with 404)
SELECT 'Testing profiles query...' as test;
SELECT id FROM public.profiles WHERE user_id = '6e7d8a45-709f-4b50-8229-d61fb6915310'::uuid LIMIT 1;

-- Test user_settings query (this is what's failing with 406)
SELECT 'Testing user_settings query...' as test;
SELECT * FROM public.user_settings WHERE user_id = '6e7d8a45-709f-4b50-8229-d61fb6915310'::uuid LIMIT 1;

-- Test daily_session_patterns query (this is what's failing with 404)
SELECT 'Testing daily_session_patterns query...' as test;
SELECT * FROM public.daily_session_patterns WHERE user_id = '6e7d8a45-709f-4b50-8229-d61fb6915310'::uuid AND date = '2025-09-30'::date LIMIT 1;

-- Test bias_state query
SELECT 'Testing bias_state query...' as test;
SELECT * FROM public.bias_state WHERE day_key = CURRENT_DATE LIMIT 1;

-- Test trades query
SELECT 'Testing trades query...' as test;
SELECT COUNT(*) as trade_count FROM public.trades WHERE user_id = '6e7d8a45-709f-4b50-8229-d61fb6915310'::uuid;

-- ============================================================================
-- TEST 11: CHECK TRIGGERS
-- ============================================================================

SELECT '=== TRIGGERS CHECK ===' as test_section;

SELECT 
  schemaname,
  tablename,
  triggername,
  triggerdef
FROM pg_triggers 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'trades', 'bias_state', 'user_settings', 'daily_session_patterns')
ORDER BY tablename, triggername;

-- ============================================================================
-- TEST 12: CHECK MATERIALIZED VIEWS
-- ============================================================================

SELECT '=== MATERIALIZED VIEWS CHECK ===' as test_section;

SELECT 
  schemaname,
  matviewname,
  CASE 
    WHEN matviewname = 'daily_performance_metrics' THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM pg_matviews 
WHERE schemaname = 'public' 
  AND matviewname = 'daily_performance_metrics';

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '=== DIAGNOSTIC SUMMARY ===' as test_section;

SELECT 
  'Total public tables' as metric,
  COUNT(*)::text as value
FROM pg_tables WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Required tables missing' as metric,
  (5 - COUNT(*))::text as value
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'trades', 'bias_state', 'user_settings', 'daily_session_patterns')

UNION ALL

SELECT 
  'Total RLS policies' as metric,
  COUNT(*)::text as value
FROM pg_policies WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Total functions' as metric,
  COUNT(*)::text as value
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'

UNION ALL

SELECT 
  'Total indexes' as metric,
  COUNT(*)::text as value
FROM pg_indexes WHERE schemaname = 'public';

SELECT '=== END OF DIAGNOSTIC ===' as test_section;
