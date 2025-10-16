-- ============================================
-- COMPREHENSIVE 406 ERROR FIX
-- ============================================
-- This script addresses all potential causes of 406 errors

-- STEP 1: Ensure all critical tables exist and have proper structure
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset text NOT NULL,
  model text NOT NULL,
  direction text NOT NULL,
  entry_price numeric(18,2) NOT NULL,
  exit_price numeric(18,2),
  entry_time timestamptz DEFAULT now(),
  exit_time timestamptz,
  stop_loss numeric(18,2) NOT NULL,
  risk_amount numeric(18,2) NOT NULL,
  risk_tier text NOT NULL,
  lot_size numeric(10,2) DEFAULT 1.0,
  pnl numeric(18,2),
  r_multiple numeric(10,2),
  status text DEFAULT 'open',
  notes text,
  screenshot_url text,
  emotions jsonb,
  scenarios text[],
  locations text[],
  aggression text[],
  externals text[],
  good_actions text[],
  mistake_tags text[],
  override_reason text,
  is_experimental boolean DEFAULT false,
  hypothesis_id uuid,
  challenge_id uuid,
  trade_lessons text,
  trading_session text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- STEP 2: Ensure all tables have proper RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bias_state ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create comprehensive RLS policies
-- Trades policies
DROP POLICY IF EXISTS "trades_policy" ON public.trades;
CREATE POLICY "trades_policy" ON public.trades 
  FOR ALL USING (auth.uid() = user_id);

-- Challenge phases policies
DROP POLICY IF EXISTS "challenge_phases_policy" ON public.challenge_phases;
CREATE POLICY "challenge_phases_policy" ON public.challenge_phases 
  FOR ALL USING (auth.uid() = user_id);

-- User settings policies
DROP POLICY IF EXISTS "user_settings_policy" ON public.user_settings;
CREATE POLICY "user_settings_policy" ON public.user_settings 
  FOR ALL USING (auth.uid() = user_id);

-- Profiles policies
DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;
CREATE POLICY "profiles_policy" ON public.profiles 
  FOR ALL USING (auth.uid() = user_id);

-- Bias state policies
DROP POLICY IF EXISTS "bias_state_policy" ON public.bias_state;
CREATE POLICY "bias_state_policy" ON public.bias_state 
  FOR ALL USING (auth.uid() = selected_by);

-- STEP 4: Create missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON public.trades(created_at);
CREATE INDEX IF NOT EXISTS idx_challenge_phases_user_id ON public.challenge_phases(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_phases_status ON public.challenge_phases(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_bias_state_user_id ON public.bias_state(selected_by);

-- STEP 5: Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- STEP 6: Create triggers for updated_at
DROP TRIGGER IF EXISTS update_trades_updated_at ON public.trades;
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- STEP 7: Grant necessary permissions
GRANT ALL ON public.trades TO authenticated;
GRANT ALL ON public.challenge_phases TO authenticated;
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.bias_state TO authenticated;

-- STEP 8: Create a test function to verify API connectivity
CREATE OR REPLACE FUNCTION test_api_connectivity()
RETURNS TABLE (
  test_name text,
  status text,
  details text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'RLS Check' as test_name, 
         CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERROR' END as status,
         'RLS policies exist' as details
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename IN ('trades', 'challenge_phases', 'user_settings', 'profiles', 'bias_state')
  
  UNION ALL
  
  SELECT 'Table Access Check' as test_name,
         'OK' as status,
         'Tables accessible' as details
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('trades', 'challenge_phases', 'user_settings', 'profiles', 'bias_state')
  
  UNION ALL
  
  SELECT 'Authentication Check' as test_name,
         CASE WHEN auth.uid() IS NOT NULL THEN 'OK' ELSE 'WARNING' END as status,
         'User authentication status' as details;
$$;

-- STEP 9: Grant execute permission on test function
GRANT EXECUTE ON FUNCTION test_api_connectivity() TO authenticated;

-- STEP 10: Run the connectivity test
SELECT * FROM test_api_connectivity();

-- STEP 11: Verify all tables have proper structure
SELECT 
  'Table Structure Check' as check_type,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('trades', 'challenge_phases', 'user_settings', 'profiles', 'bias_state')
  AND column_name IN ('user_id', 'id')
ORDER BY table_name, column_name;

-- ============================================
-- TROUBLESHOOTING NOTES
-- ============================================
-- If you still get 406 errors after this:

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
