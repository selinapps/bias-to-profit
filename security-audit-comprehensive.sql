-- ============================================
-- COMPREHENSIVE SECURITY AUDIT
-- ============================================
-- This script performs a comprehensive security audit of your Supabase database

-- 1. Check for SECURITY DEFINER views
SELECT 
  'SECURITY DEFINER Views' as audit_type,
  schemaname,
  viewname,
  'WARNING: View has SECURITY DEFINER' as status
FROM pg_views 
WHERE schemaname = 'public' 
  AND definition LIKE '%SECURITY DEFINER%';

-- 2. Check for SECURITY DEFINER functions
SELECT 
  'SECURITY DEFINER Functions' as audit_type,
  n.nspname as schema_name,
  p.proname as function_name,
  CASE 
    WHEN p.prosecdef THEN 'WARNING: Function has SECURITY DEFINER'
    ELSE 'OK: Function is SECURITY INVOKER'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true;

-- 3. Check RLS status on all tables
SELECT 
  'RLS Status Check' as audit_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN 'OK: RLS enabled'
    ELSE 'WARNING: RLS not enabled'
  END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Check RLS policies
SELECT 
  'RLS Policies Check' as audit_type,
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN policyname IS NOT NULL THEN 'OK: Policy exists'
    ELSE 'WARNING: No policies found'
  END as status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. Check for overly permissive policies
SELECT 
  'Overly Permissive Policies' as audit_type,
  schemaname,
  tablename,
  policyname,
  qual as using_clause,
  with_check as with_check_clause,
  CASE 
    WHEN qual = 'true' OR with_check = 'true' THEN 'WARNING: Policy allows all access'
    ELSE 'OK: Policy has restrictions'
  END as status
FROM pg_policies 
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true');

-- 6. Check for functions that bypass RLS
SELECT 
  'Functions Bypassing RLS' as audit_type,
  n.nspname as schema_name,
  p.proname as function_name,
  CASE 
    WHEN p.prosecdef THEN 'WARNING: Function bypasses RLS'
    ELSE 'OK: Function respects RLS'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND p.proname LIKE '%bias%' OR p.proname LIKE '%performance%' OR p.proname LIKE '%challenge%';

-- 7. Check for missing indexes on sensitive columns
SELECT 
  'Missing Indexes on Sensitive Columns' as audit_type,
  t.table_name,
  c.column_name,
  CASE 
    WHEN c.column_name IN ('user_id', 'id') AND i.indexname IS NULL THEN 'WARNING: Missing index on sensitive column'
    ELSE 'OK: Index exists or not needed'
  END as status
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN pg_indexes i ON i.tablename = t.table_name AND i.indexdef LIKE '%' || c.column_name || '%'
WHERE t.table_schema = 'public'
  AND c.column_name IN ('user_id', 'id')
  AND t.table_type = 'BASE TABLE';

-- 8. Check for public access to sensitive tables
SELECT 
  'Public Access Check' as audit_type,
  schemaname,
  tablename,
  CASE 
    WHEN has_table_privilege('public', schemaname||'.'||tablename, 'SELECT') THEN 'WARNING: Public has SELECT access'
    ELSE 'OK: No public access'
  END as status
FROM pg_tables 
WHERE schemaname = 'public';

-- 9. Summary of security issues
SELECT 
  'Security Summary' as audit_type,
  'Total SECURITY DEFINER views' as metric,
  COUNT(*) as count
FROM pg_views 
WHERE schemaname = 'public' 
  AND definition LIKE '%SECURITY DEFINER%'

UNION ALL

SELECT 
  'Security Summary' as audit_type,
  'Total SECURITY DEFINER functions' as metric,
  COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true

UNION ALL

SELECT 
  'Security Summary' as audit_type,
  'Tables without RLS' as metric,
  COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public'
  AND rowsecurity = false

UNION ALL

SELECT 
  'Security Summary' as audit_type,
  'Overly permissive policies' as metric,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true');

-- ============================================
-- RECOMMENDATIONS
-- ============================================
-- Based on the audit results:

-- 1. If you see SECURITY DEFINER views: Run fix-security-definer-views.sql
-- 2. If you see tables without RLS: Enable RLS and create proper policies
-- 3. If you see overly permissive policies: Restrict them to use auth.uid()
-- 4. If you see missing indexes: Add indexes on user_id columns for performance
-- 5. If you see public access: Remove public privileges and use RLS instead
