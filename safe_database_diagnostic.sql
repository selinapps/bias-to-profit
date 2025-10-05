-- SAFE DATABASE DIAGNOSTIC TEST SCRIPT
-- This version won't fail on missing tables

-- ============================================================================
-- TEST 1: CHECK IF ALL REQUIRED TABLES EXIST (SAFE VERSION)
-- ============================================================================

SELECT '=== TABLE EXISTENCE CHECK ===' as test_section;

SELECT 
  tablename,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND pg_tables.tablename = required_tables.tablename
    ) THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM (VALUES 
  ('profiles'),
  ('trades'), 
  ('bias_state'), 
  ('user_settings'), 
  ('daily_session_patterns')
) AS required_tables(tablename)
ORDER BY tablename;

-- Show all public tables
SELECT '=== ALL PUBLIC TABLES ===' as test_section;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- ============================================================================
-- TEST 2: CHECK TABLE STRUCTURES (SAFE VERSION)
-- ============================================================================

SELECT '=== TABLE STRUCTURE CHECK ===' as test_section;

-- Check profiles table structure (safe)
SELECT 'Profiles table structure:' as table_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check user_settings table structure (safe)
SELECT 'User_settings table structure:' as table_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_settings'
ORDER BY ordinal_position;

-- Check daily_session_patterns table structure (safe)
SELECT 'Daily_session_patterns table structure:' as table_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'daily_session_patterns'
ORDER BY ordinal_position;

-- Check bias_state table structure (safe)
SELECT 'Bias_state table structure:' as table_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'bias_state'
ORDER BY ordinal_position;

-- Check trades table structure (safe)
SELECT 'Trades table structure:' as table_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'trades'
ORDER BY ordinal_position;

-- ============================================================================
-- TEST 3: CHECK ROW LEVEL SECURITY (SAFE VERSION)
-- ============================================================================

SELECT '=== ROW LEVEL SECURITY CHECK ===' as test_section;

SELECT 
  tablename,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND pg_tables.tablename = required_tables.tablename AND rowsecurity = true
    ) THEN '✅ RLS ENABLED'
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND pg_tables.tablename = required_tables.tablename AND rowsecurity = false
    ) THEN '❌ RLS DISABLED'
    ELSE '❌ TABLE MISSING'
  END as status
FROM (VALUES 
  ('profiles'),
  ('trades'), 
  ('bias_state'), 
  ('user_settings'), 
  ('daily_session_patterns')
) AS required_tables(tablename)
ORDER BY tablename;

-- ============================================================================
-- TEST 4: CHECK RLS POLICIES (SAFE VERSION)
-- ============================================================================

SELECT '=== RLS POLICIES CHECK ===' as test_section;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'trades', 'bias_state', 'user_settings', 'daily_session_patterns')
ORDER BY tablename, policyname;

-- ============================================================================
-- TEST 5: CHECK VIEWS (SAFE VERSION)
-- ============================================================================

SELECT '=== VIEWS CHECK ===' as test_section;

SELECT 
  viewname,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_views 
      WHERE schemaname = 'public' AND pg_views.viewname = required_views.viewname
    ) THEN '✅ EXISTS' 
    ELSE '❌ MISSING' 
  END as status
FROM (VALUES 
  ('v_current_bias'),
  ('secure_daily_performance_metrics'),
  ('v_current_session_pattern')
) AS required_views(viewname)
ORDER BY viewname;

-- ============================================================================
-- TEST 6: CHECK FUNCTIONS (SAFE VERSION)
-- ============================================================================

SELECT '=== FUNCTIONS CHECK ===' as test_section;

SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  pg_get_function_arguments(p.oid) as arguments,
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
-- TEST 7: CHECK INDEXES (SAFE VERSION)
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
-- TEST 8: CHECK ENUMS (SAFE VERSION)
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
-- TEST 9: CHECK PERMISSIONS (SAFE VERSION)
-- ============================================================================

SELECT '=== PERMISSIONS CHECK ===' as test_section;

-- Check table permissions (safe)
SELECT 
  tablename,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND pg_tables.tablename = required_tables.tablename
    ) THEN 
      CASE 
        WHEN has_table_privilege('authenticated', 'public.'||required_tables.tablename, 'SELECT') THEN '✅ SELECT'
        ELSE '❌ NO SELECT'
      END
    ELSE '❌ TABLE MISSING'
  END as select_permission,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND pg_tables.tablename = required_tables.tablename
    ) THEN 
      CASE 
        WHEN has_table_privilege('authenticated', 'public.'||required_tables.tablename, 'INSERT') THEN '✅ INSERT'
        ELSE '❌ NO INSERT'
      END
    ELSE '❌ TABLE MISSING'
  END as insert_permission
FROM (VALUES 
  ('profiles'),
  ('trades'), 
  ('bias_state'), 
  ('user_settings'), 
  ('daily_session_patterns')
) AS required_tables(tablename)
ORDER BY tablename;

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

SELECT '=== END OF SAFE DIAGNOSTIC ===' as test_section;
