-- ============================================
-- COMPLETE USER SETUP FIX
-- ============================================
-- This script fixes the user setup issues completely

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS setup_new_user(uuid);

-- Create a robust function to set up new user data
CREATE OR REPLACE FUNCTION setup_new_user(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  profile_exists boolean := false;
  settings_exists boolean := false;
  current_user_id uuid;
BEGIN
  -- Get the current authenticated user
  current_user_id := auth.uid();
  
  -- Check if user_id is provided
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User ID is required',
      'user_id', p_user_id,
      'current_user', current_user_id
    );
  END IF;
  
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = p_user_id) INTO profile_exists;
  
  -- Check if settings already exist
  SELECT EXISTS(SELECT 1 FROM user_settings WHERE user_id = p_user_id) INTO settings_exists;
  
  -- Create profile if it doesn't exist
  IF NOT profile_exists THEN
    INSERT INTO profiles (user_id, display_name, timezone, risk_settings)
    VALUES (
      p_user_id,
      'Trader',
      'UTC',
      '{}'::jsonb
    );
  END IF;
  
  -- Create user settings if they don't exist
  IF NOT settings_exists THEN
    INSERT INTO user_settings (
      user_id,
      auto_backup,
      auto_save,
      bias_reminders,
      compact_mode,
      debug_mode,
      default_model,
      default_risk_amount,
      enable_stop_rule,
      experimental_features,
      notifications_enabled,
      session_alerts,
      show_advanced_features,
      theme,
      trade_alerts
    ) VALUES (
      p_user_id,
      false,
      true,
      true,
      false,
      false,
      'trend',
      100.00,
      true,
      false,
      true,
      true,
      false,
      'system',
      true
    );
  END IF;
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'profile_created', NOT profile_exists,
    'settings_created', NOT settings_exists,
    'user_id', p_user_id,
    'current_user', current_user_id
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', p_user_id,
      'current_user', current_user_id
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION setup_new_user(uuid) TO authenticated;

-- ============================================
-- MANUAL SETUP FOR EXISTING USERS
-- ============================================
-- Run this to set up users who don't have profiles/settings

-- Find users without profiles
SELECT 
  'Users without profiles' as issue,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;

-- Find users without settings
SELECT 
  'Users without settings' as issue,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN user_settings us ON au.id = us.user_id
WHERE us.user_id IS NULL;

-- Get list of users that need setup
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE WHEN p.user_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_profile,
  CASE WHEN us.user_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_settings
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
LEFT JOIN user_settings us ON au.id = us.user_id
WHERE p.user_id IS NULL OR us.user_id IS NULL
ORDER BY au.created_at DESC;

-- ============================================
-- SETUP ALL MISSING USERS
-- ============================================
-- This will set up all users who are missing profiles or settings

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

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that all users now have profiles and settings
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
