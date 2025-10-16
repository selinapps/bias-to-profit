-- ============================================
-- FIX NEW USER REGISTRATION ISSUES
-- ============================================
-- This script creates a function to properly set up new users

-- Create a function to set up new user data
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
BEGIN
  -- Check if user_id is provided
  IF p_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User ID is required',
      'user_id', p_user_id
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
    'user_id', p_user_id
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION setup_new_user(uuid) TO authenticated;

-- Create a trigger to automatically set up new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the setup function for new users
  PERFORM setup_new_user(NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (if possible)
-- Note: This might not work if we don't have direct access to auth schema
-- In that case, the application should call setup_new_user() after user creation

-- Test the function (only if user is authenticated)
SELECT setup_new_user(auth.uid()) WHERE auth.uid() IS NOT NULL;

-- ============================================
-- MANUAL SETUP FOR EXISTING USERS
-- ============================================
-- If you have existing users without profiles/settings, run this:

/*
-- Find users without profiles
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;

-- Find users without settings
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN user_settings us ON au.id = us.user_id
WHERE us.user_id IS NULL;

-- Set up existing users (replace with actual user IDs)
-- SELECT setup_new_user('user-id-here');
*/

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that all users have profiles and settings
SELECT 
  'User Setup Check' as check_type,
  COUNT(DISTINCT au.id) as total_users,
  COUNT(DISTINCT p.user_id) as users_with_profiles,
  COUNT(DISTINCT us.user_id) as users_with_settings,
  COUNT(DISTINCT au.id) - COUNT(DISTINCT p.user_id) as missing_profiles,
  COUNT(DISTINCT au.id) - COUNT(DISTINCT us.user_id) as missing_settings
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
LEFT JOIN user_settings us ON au.id = us.user_id;
