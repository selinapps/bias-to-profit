-- ============================================
-- COMPREHENSIVE 406 ERROR FIX
-- ============================================

-- Step 1: Ensure all required tables exist with proper structure
-- (Skip if tables already exist)

-- Step 2: Fix RLS policies for all tables
-- Drop existing policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Create comprehensive RLS policies
-- Profiles table
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON profiles
    FOR DELETE USING (auth.uid() = user_id);

-- User settings table
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Trades table (if exists)
CREATE POLICY "Users can view their own trades" ON trades
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades" ON trades
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" ON trades
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades" ON trades
    FOR DELETE USING (auth.uid() = user_id);

-- Bias snapshots table (if exists)
CREATE POLICY "Users can view their own bias snapshots" ON bias_snapshots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bias snapshots" ON bias_snapshots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bias snapshots" ON bias_snapshots
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bias snapshots" ON bias_snapshots
    FOR DELETE USING (auth.uid() = user_id);

-- Challenge phases table (if exists)
CREATE POLICY "Users can view their own challenges" ON challenge_phases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges" ON challenge_phases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges" ON challenge_phases
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenges" ON challenge_phases
    FOR DELETE USING (auth.uid() = user_id);

-- Step 3: Ensure RLS is enabled on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on other tables if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trades' AND table_schema = 'public') THEN
        ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bias_snapshots' AND table_schema = 'public') THEN
        ALTER TABLE bias_snapshots ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenge_phases' AND table_schema = 'public') THEN
        ALTER TABLE challenge_phases ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 4: Create a function to test API connectivity
CREATE OR REPLACE FUNCTION test_api_connectivity()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
    user_count integer;
    profile_count integer;
    settings_count integer;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO settings_count FROM user_settings;
    
    -- Build result
    result := json_build_object(
        'success', true,
        'timestamp', NOW(),
        'user_id', auth.uid(),
        'user_count', user_count,
        'profile_count', profile_count,
        'settings_count', settings_count,
        'message', 'API connectivity test successful'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'timestamp', NOW(),
            'user_id', auth.uid()
        );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION test_api_connectivity() TO authenticated;

-- Step 5: Test the fix
SELECT test_api_connectivity();

-- Step 6: Verify all policies are in place
SELECT 
    'Policy Check' as check_type,
    schemaname,
    tablename,
    policyname,
    cmd as operation
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
