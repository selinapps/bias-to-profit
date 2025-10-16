-- ============================================
-- TEST USER SETUP FUNCTION
-- ============================================
-- Run this to test the setup_new_user function

-- First, let's see what users exist
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

-- Test the setup function with a specific user ID
-- Replace 'YOUR_USER_ID_HERE' with an actual user ID from the query above
-- SELECT setup_new_user('YOUR_USER_ID_HERE');

-- Alternative: Test with the most recent user
-- SELECT setup_new_user((SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1));
