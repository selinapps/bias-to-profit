-- ============================================
-- CORRECT USER SETUP - USING ACTUAL COLUMNS
-- ============================================

-- Step 1: Check which users need setup
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

-- Step 2: Create profiles for users who don't have them
INSERT INTO profiles (user_id, display_name, timezone, risk_settings)
SELECT 
  au.id,
  'Trader',
  'UTC',
  '{"tier_a": 100, "tier_b": 50, "tier_c": 25, "max_daily_loss": 500, "house_money_threshold": 3}'::jsonb
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Create user_settings for users who don't have them
INSERT INTO user_settings (
  user_id,
  last_model,
  last_risk_tier,
  last_locations,
  last_aggression,
  daily_wrap_time,
  notifications_enabled,
  offline_mode,
  edge_reminders,
  preferred_assets,
  default_risk_amount,
  max_daily_losses,
  enable_stop_rule,
  enable_house_money,
  house_money_threshold,
  theme,
  compact_mode,
  show_advanced_features,
  auto_save,
  trade_alerts,
  session_alerts,
  bias_reminders,
  data_retention_days,
  export_format,
  auto_backup,
  experimental_features,
  debug_mode,
  custom_risk_amounts,
  custom_mistake_tags,
  custom_good_actions
)
SELECT 
  au.id,
  'trend',                    -- last_model
  'a',                        -- last_risk_tier
  '{}',                       -- last_locations
  '{}',                       -- last_aggression
  '21:00:00',                 -- daily_wrap_time
  true,                       -- notifications_enabled
  false,                      -- offline_mode
  '{}',                       -- edge_reminders
  '{}',                       -- preferred_assets
  250,                        -- default_risk_amount
  3,                          -- max_daily_losses
  true,                       -- enable_stop_rule
  true,                       -- enable_house_money
  3,                          -- house_money_threshold
  'dark',                     -- theme
  false,                      -- compact_mode
  true,                       -- show_advanced_features
  true,                       -- auto_save
  true,                       -- trade_alerts
  true,                       -- session_alerts
  true,                       -- bias_reminders
  365,                        -- data_retention_days
  'csv',                      -- export_format
  false,                      -- auto_backup
  false,                      -- experimental_features
  false,                      -- debug_mode
  '{"a": 100, "b": 50, "c": 25}', -- custom_risk_amounts
  '{}',                       -- custom_mistake_tags
  '{}'                        -- custom_good_actions
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
