-- ============================================
-- DEBUG API KEY AND AUTHENTICATION ISSUES
-- ============================================

-- Check if the challenge_phases table exists
SELECT 
  'Table Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenge_phases' AND table_schema = 'public') 
    THEN 'challenge_phases table exists ✅' 
    ELSE 'challenge_phases table missing ❌' 
  END as status;

-- If table exists, check its structure
SELECT 
  'Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'challenge_phases' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS policies on challenge_phases
SELECT 
  'RLS Policies' as check_type,
  policyname,
  cmd as operation,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'challenge_phases' 
AND schemaname = 'public';

-- Check if RLS is enabled
SELECT 
  'RLS Status' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'challenge_phases' 
AND schemaname = 'public';

-- Test basic authentication
SELECT 
  'Auth Test' as check_type,
  auth.uid() as current_user_id,
  auth.role() as current_role,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'User authenticated ✅' 
    ELSE 'No user authenticated ❌' 
  END as auth_status;

-- Check if there are any challenge_phases records
SELECT 
  'Data Check' as check_type,
  COUNT(*) as total_challenges,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_challenges
FROM challenge_phases;

-- Test a simple query that should work
SELECT 
  'Simple Query Test' as check_type,
  NOW() as current_time,
  'Database accessible' as status;
