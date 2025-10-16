-- ============================================
-- DIAGNOSE 406 ERRORS AND DATABASE ISSUES
-- ============================================

-- Check RLS policies on all tables
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
ORDER BY tablename, policyname;

-- Check if tables exist and have data
SELECT 
  'Tables Check' as check_type,
  schemaname,
  tablename,
  CASE WHEN schemaname IS NOT NULL THEN 'Exists' ELSE 'Missing' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_settings', 'challenge_phases', 'bias_snapshots', 'trades')
ORDER BY table_name;

-- Check current user and authentication
SELECT 
  'Auth Check' as check_type,
  auth.uid() as current_user_id,
  auth.role() as current_role,
  current_user as db_user;

-- Test basic connectivity
SELECT 
  'Connectivity Test' as check_type,
  COUNT(*) as total_users,
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM user_settings) as total_settings
FROM auth.users;

-- Check for any error logs or issues
SELECT 
  'Error Check' as check_type,
  'No specific error logs available' as message;

-- Test a simple query that should work
SELECT 
  'Simple Test' as test_name,
  NOW() as current_time,
  'Database is accessible' as status;
