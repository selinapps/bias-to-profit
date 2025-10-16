-- ============================================
-- DIAGNOSE SECURITY DEFINER ISSUE
-- ============================================
-- This script helps diagnose why SECURITY DEFINER is persisting

-- 1. Check current view definitions
SELECT 
  'Current View Definitions' as check_type,
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname IN ('v_current_bias', 'v_current_session_pattern', 'secure_daily_performance_metrics');

-- 2. Check if there are any functions with these names
SELECT 
  'Functions with Similar Names' as check_type,
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as has_security_definer
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname LIKE '%bias%' OR p.proname LIKE '%session%' OR p.proname LIKE '%performance%');

-- 3. Check for any dependencies
SELECT 
  'Dependencies Check' as check_type,
  c.relname as dependent_object,
  c.relkind as object_type,
  d.deptype as dependency_type
FROM pg_depend d
JOIN pg_class c ON d.refobjid = c.oid
WHERE d.refobjid IN (
  SELECT oid FROM pg_class 
  WHERE relname IN ('v_current_bias', 'v_current_session_pattern', 'secure_daily_performance_metrics')
  AND relkind = 'v'
);

-- 4. Check for any triggers on these views
SELECT 
  'Triggers Check' as check_type,
  t.tgname as trigger_name,
  c.relname as table_name,
  p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN ('v_current_bias', 'v_current_session_pattern', 'secure_daily_performance_metrics');

-- 5. Check system catalogs for SECURITY DEFINER
SELECT 
  'System Catalog Check' as check_type,
  c.relname as object_name,
  c.relkind as object_type,
  'View' as object_category
FROM pg_class c
WHERE c.relname IN ('v_current_bias', 'v_current_session_pattern', 'secure_daily_performance_metrics')
  AND c.relkind = 'v';

-- 6. Check if there are any migrations that recreate these views
SELECT 
  'Migration Check' as check_type,
  'Check supabase/migrations folder for any files that recreate these views' as note;

-- 7. Alternative: Check if the views are actually materialized views
SELECT 
  'Materialized Views Check' as check_type,
  schemaname,
  matviewname,
  definition
FROM pg_matviews 
WHERE schemaname = 'public' 
  AND matviewname IN ('v_current_bias', 'v_current_session_pattern', 'secure_daily_performance_metrics');

-- 8. Check for any views in other schemas
SELECT 
  'Views in Other Schemas' as check_type,
  schemaname,
  viewname,
  CASE 
    WHEN definition LIKE '%SECURITY DEFINER%' THEN 'HAS SECURITY DEFINER'
    ELSE 'OK'
  END as security_status
FROM pg_views 
WHERE viewname IN ('v_current_bias', 'v_current_session_pattern', 'secure_daily_performance_metrics')
ORDER BY schemaname, viewname;

-- ============================================
-- MANUAL FIX OPTIONS
-- ============================================

-- If the diagnostic shows the views still exist with SECURITY DEFINER,
-- try these manual commands one by one:

/*
-- Option 1: Force drop with RESTRICT to see what's preventing it
DROP VIEW public.v_current_bias RESTRICT;
DROP VIEW public.v_current_session_pattern RESTRICT;
DROP VIEW public.secure_daily_performance_metrics RESTRICT;

-- Option 2: Check what's using these views
SELECT 
  schemaname,
  tablename,
  viewname,
  definition
FROM pg_views 
WHERE definition LIKE '%v_current_bias%' 
   OR definition LIKE '%v_current_session_pattern%'
   OR definition LIKE '%secure_daily_performance_metrics%';

-- Option 3: Recreate with explicit SECURITY INVOKER
CREATE OR REPLACE VIEW public.v_current_bias 
WITH (security_invoker = true) AS
SELECT 
  bs.active,
  bs.bias,
  bs.confidence,
  bs.day_key,
  bs.id,
  bs.market_state,
  bs.selected_at,
  bs.selected_by,
  bs.tags
FROM public.bias_state bs
WHERE bs.active = true
  AND bs.day_key = CURRENT_DATE;
*/
