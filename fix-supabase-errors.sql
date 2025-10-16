-- ============================================
-- SUPABASE ERROR FIX SCRIPT
-- ============================================
-- Run this in your Supabase SQL Editor to fix the 400/406 errors

-- 1. Ensure challenge_phases table exists
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

-- 2. Ensure user_settings table exists with proper structure
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  auto_backup boolean DEFAULT false,
  auto_save boolean DEFAULT true,
  bias_reminders boolean DEFAULT true,
  compact_mode boolean DEFAULT false,
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE public.challenge_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for challenge_phases
DROP POLICY IF EXISTS "Users can manage their own challenges" ON public.challenge_phases;
CREATE POLICY "Users can manage their own challenges" ON public.challenge_phases 
  FOR ALL USING (auth.uid() = user_id);

-- 5. Create RLS policies for user_settings
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
CREATE POLICY "Users can manage their own settings" ON public.user_settings 
  FOR ALL USING (auth.uid() = user_id);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenge_active ON public.challenge_phases(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- 7. Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Create triggers for updated_at
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

-- 9. Verify tables exist and have proper permissions
SELECT 
  'Tables created successfully' as status,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('challenge_phases', 'user_settings')
  AND schemaname = 'public';

-- 10. Check RLS policies
SELECT 
  'RLS Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename IN ('challenge_phases', 'user_settings')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- TROUBLESHOOTING NOTES
-- ============================================
-- If you still get 406 errors:
-- 1. Check that your Supabase client has proper headers (Accept: application/json)
-- 2. Verify the user is authenticated (auth.uid() should return the user ID)
-- 3. Check that RLS policies are working correctly
-- 4. Ensure the user_id in the request matches auth.uid()

-- If you get 400 errors:
-- 1. Check your email/password are correct
-- 2. Verify your Supabase URL and anon key are correct
-- 3. Check that email confirmation is not required
-- 4. Ensure the user exists in auth.users table
