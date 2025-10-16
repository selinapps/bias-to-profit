-- ============================================
-- DIAGNOSE 406 ERROR FOR CHALLENGE_PHASES
-- ============================================

-- Step 1: Check current user authentication
SELECT 
  'Auth Check' as check_type,
  auth.uid() as current_user_id,
  auth.role() as current_role,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN 'User authenticated ✅' 
    ELSE 'No user authenticated ❌' 
  END as auth_status;

-- Step 2: Check RLS policies on challenge_phases
SELECT 
  'RLS Policies' as check_type,
  policyname,
  cmd as operation,
  permissive,
  roles,
  qual as condition
FROM pg_policies 
WHERE tablename = 'challenge_phases' 
AND schemaname = 'public'
ORDER BY policyname;

-- Step 3: Check if RLS is enabled
SELECT 
  'RLS Status' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'challenge_phases' 
AND schemaname = 'public';

-- Step 4: Check all challenges (as admin)
SELECT 
  'All Challenges' as check_type,
  id,
  user_id,
  challenge_name,
  status,
  created_at
FROM challenge_phases
ORDER BY created_at DESC;

-- Step 5: Test the exact query that's failing
SELECT 
  'Test Query' as check_type,
  *
FROM challenge_phases
WHERE user_id = auth.uid()
AND status = 'active';

-- Step 6: Check if the specific user has any challenges
SELECT 
  'User Challenges' as check_type,
  COUNT(*) as total_challenges,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_challenges
FROM challenge_phases
WHERE user_id = auth.uid();

-- Step 7: Check user permissions
SELECT 
  'User Permissions' as check_type,
  has_table_privilege(auth.uid(), 'challenge_phases', 'SELECT') as can_select,
  has_table_privilege(auth.uid(), 'challenge_phases', 'INSERT') as can_insert,
  has_table_privilege(auth.uid(), 'challenge_phases', 'UPDATE') as can_update,
  has_table_privilege(auth.uid(), 'challenge_phases', 'DELETE') as can_delete;
