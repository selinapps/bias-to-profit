-- ============================================
-- RUN THIS SQL TO FIX USER SETUP
-- ============================================

-- First, let's see what users exist and their setup status
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE WHEN p.user_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_profile,
  CASE WHEN us.user_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_settings
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
LEFT JOIN user_settings us ON au.id = us.user_id
ORDER BY au.created_at DESC
LIMIT 10;

-- Now let's set up all users who are missing profiles or settings
DO $$
DECLARE
  user_record RECORD;
  setup_result json;
BEGIN
  FOR user_record IN 
    SELECT au.id
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.user_id
    LEFT JOIN user_settings us ON au.id = us.user_id
    WHERE p.user_id IS NULL OR us.user_id IS NULL
  LOOP
    SELECT setup_new_user(user_record.id) INTO setup_result;
    RAISE NOTICE 'Setup result for user %: %', user_record.id, setup_result;
  END LOOP;
END $$;

-- Verify the fix worked
SELECT 
  'Final User Setup Check' as check_type,
  COUNT(DISTINCT au.id) as total_users,
  COUNT(DISTINCT p.user_id) as users_with_profiles,
  COUNT(DISTINCT us.user_id) as users_with_settings,
  COUNT(DISTINCT au.id) - COUNT(DISTINCT p.user_id) as missing_profiles,
  COUNT(DISTINCT au.id) - COUNT(DISTINCT us.user_id) as missing_settings
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
LEFT JOIN user_settings us ON au.id = us.user_id;
