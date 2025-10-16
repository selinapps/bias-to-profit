-- ============================================
-- COMPREHENSIVE 406 ERROR FIX SCRIPT
-- ============================================
-- This script addresses all potential causes of 406 errors

-- 1. Ensure all tables exist with correct structure
CREATE TABLE IF NOT EXISTS public.challenge_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prop_firm text NOT NULL CHECK (prop_firm IN ('Funded Hive', 'Topstep')),
  phase text NOT NULL CHECK (phase IN ('1', '2', 'Funded')) DEFAULT '1',
  starting_balance numeric(18,2) NOT NULL CHECK (starting_balance > 0),
  target_profit numeric(18,2) NOT NULL CHECK (target_profit > 0),
  user_reported_current_balance numeric(18,2) CHECK (user_reported_current_balance >= 0),
  status text NOT NULL CHECK (status IN ('active', 'passed', 'failed', 'halted')) DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Fix user_settings table structure to match types
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  auto_backup boolean DEFAULT false,
  auto_save boolean DEFAULT true,
  bias_reminders boolean DEFAULT true,
  compact_mode boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  custom_good_actions text[] DEFAULT '{}',
  custom_mistake_tags text[] DEFAULT '{}',
  custom_risk_amounts jsonb DEFAULT '{}',
  daily_wrap_time text,
  data_retention_days integer DEFAULT 365,
  debug_mode boolean DEFAULT false,
  default_model text DEFAULT 'trend',
  default_risk_amount numeric(10,2) DEFAULT 100.00,
  edge_reminders jsonb DEFAULT '{}',
  enable_house_money boolean DEFAULT false,
  enable_stop_rule boolean DEFAULT true,
  experimental_features boolean DEFAULT false,
  export_format text DEFAULT 'json',
  house_money_threshold numeric(10,2) DEFAULT 1000.00,
  last_aggression text[] DEFAULT '{}',
  last_locations text[] DEFAULT '{}',
  last_model text DEFAULT 'trend',
  last_risk_tier text DEFAULT 'medium',
  max_daily_losses integer DEFAULT 3,
  notifications_enabled boolean DEFAULT true,
  offline_mode boolean DEFAULT false,
  preferred_assets text[] DEFAULT '{}',
  session_alerts boolean DEFAULT true,
  show_advanced_features boolean DEFAULT false,
  theme text DEFAULT 'system',
  trade_alerts boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- 3. Ensure profiles table exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_name text,
  timezone text,
  risk_settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Drop and recreate RLS policies to ensure they're correct
ALTER TABLE public.challenge_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own challenges" ON public.challenge_phases;
DROP POLICY IF EXISTS "Users can insert their own challenges" ON public.challenge_phases;
DROP POLICY IF EXISTS "Users can update their own challenges" ON public.challenge_phases;
DROP POLICY IF EXISTS "Users can delete their own challenges" ON public.challenge_phases;
DROP POLICY IF EXISTS "Users can manage their own challenges" ON public.challenge_phases;

DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.profiles;

-- Create new, simplified RLS policies
CREATE POLICY "challenge_phases_policy" ON public.challenge_phases 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_settings_policy" ON public.user_settings 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "profiles_policy" ON public.profiles 
  FOR ALL USING (auth.uid() = user_id);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenge_phases_user_id ON public.challenge_phases(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_phases_status ON public.challenge_phases(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 6. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create triggers for updated_at
DROP TRIGGER IF EXISTS update_challenge_phases_updated_at ON public.challenge_phases;
CREATE TRIGGER update_challenge_phases_updated_at
  BEFORE UPDATE ON public.challenge_phases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Grant necessary permissions
GRANT ALL ON public.challenge_phases TO authenticated;
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- 9. Verify the setup
SELECT 
  'Table Verification' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('challenge_phases', 'user_settings', 'profiles')
  AND schemaname = 'public'
ORDER BY tablename;

-- 10. Check RLS policies
SELECT 
  'RLS Policy Verification' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename IN ('challenge_phases', 'user_settings', 'profiles')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- 11. Test basic queries (this will help identify any remaining issues)
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Get a test user ID (if any users exist)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE 'Testing queries with user_id: %', test_user_id;
    
    -- Test challenge_phases query
    PERFORM 1 FROM public.challenge_phases WHERE user_id = test_user_id LIMIT 1;
    RAISE NOTICE 'challenge_phases query: OK';
    
    -- Test user_settings query
    PERFORM 1 FROM public.user_settings WHERE user_id = test_user_id LIMIT 1;
    RAISE NOTICE 'user_settings query: OK';
    
    -- Test profiles query
    PERFORM 1 FROM public.profiles WHERE user_id = test_user_id LIMIT 1;
    RAISE NOTICE 'profiles query: OK';
    
  ELSE
    RAISE NOTICE 'No users found in auth.users - tests skipped';
  END IF;
END $$;

-- ============================================
-- TROUBLESHOOTING NOTES
-- ============================================
-- If you still get 406 errors after running this script:

-- 1. Check browser console for specific error details
-- 2. Verify the user is properly authenticated
-- 3. Check that the Supabase client has proper headers
-- 4. Ensure the user exists in auth.users table
-- 5. Try clearing browser cache and localStorage
-- 6. Check if there are any CORS issues

-- Common causes of 406 errors:
-- - Missing Accept header
-- - Incorrect Content-Type header
-- - RLS policies blocking access
-- - Table doesn't exist
-- - User not authenticated
-- - Invalid user_id in query

-- To debug further:
-- 1. Open browser DevTools
-- 2. Go to Network tab
-- 3. Look for the failing request
-- 4. Check the request headers
-- 5. Check the response details
