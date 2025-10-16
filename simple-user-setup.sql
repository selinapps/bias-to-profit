-- ============================================
-- SIMPLE USER SETUP - NO FUNCTION REQUIRED
-- ============================================

-- Step 1: Check which users need setup
SELECT 
  au.id,
  au.email,
  au.created_at,
  CASE WHEN p.user_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_profile,
  CASE WHEN us.user_id IS NOT NULL THEN 'No' ELSE 'Yes' END as needs_settings
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
LEFT JOIN user_settings us ON au.id = us.user_id
WHERE p.user_id IS NULL OR us.user_id IS NULL
ORDER BY au.created_at DESC;

-- Step 2: Create profiles for users who don't have them
INSERT INTO profiles (user_id, display_name, timezone, risk_settings)
SELECT 
  au.id,
  'Trader',
  'UTC',
  '{}'::jsonb
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Create user_settings for users who don't have them
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
)
SELECT 
  au.id,
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
FROM auth.users au
LEFT JOIN user_settings us ON au.id = us.user_id
WHERE us.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Verify the fix
SELECT 
  'User Setup Check' as check_type,
  COUNT(DISTINCT au.id) as total_users,
  COUNT(DISTINCT p.user_id) as users_with_profiles,
  COUNT(DISTINCT us.user_id) as users_with_settings,
  CASE 
    WHEN COUNT(DISTINCT au.id) = COUNT(DISTINCT p.user_id) 
    AND COUNT(DISTINCT au.id) = COUNT(DISTINCT us.user_id) 
    THEN 'All users have profiles and settings! ✅' 
    ELSE 'Some users still need setup ❌' 
  END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
LEFT JOIN user_settings us ON au.id = us.user_id;
