-- ============================================
-- SAFE CHALLENGE_PHASES TABLE FIX
-- ============================================

-- Step 1: Check if challenge_phases table exists and its structure
SELECT 
  'Table Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenge_phases' AND table_schema = 'public') 
    THEN 'challenge_phases table exists ✅' 
    ELSE 'challenge_phases table missing ❌' 
  END as status;

-- Step 2: Check existing policies (if any)
SELECT 
  'Existing Policies' as check_type,
  policyname,
  cmd as operation,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'challenge_phases' 
AND schemaname = 'public';

-- Step 3: Create table if it doesn't exist (safe approach)
CREATE TABLE IF NOT EXISTS challenge_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_name TEXT NOT NULL DEFAULT '30-Day Discipline Challenge',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'paused')),
  current_phase TEXT NOT NULL DEFAULT 'phase1' CHECK (current_phase IN ('phase1', 'phase2', 'phase3', 'phase4', 'phase5')),
  max_daily_losses INTEGER NOT NULL DEFAULT 3,
  max_risk_per_trade NUMERIC NOT NULL DEFAULT 2.00,
  house_money_threshold NUMERIC NOT NULL DEFAULT 3.00,
  must_follow_setup BOOLEAN NOT NULL DEFAULT true,
  no_sl_movement BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_challenge_phases_user_id ON challenge_phases(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_phases_status ON challenge_phases(status);
CREATE INDEX IF NOT EXISTS idx_challenge_phases_user_status ON challenge_phases(user_id, status);

-- Step 5: Enable RLS if not already enabled
ALTER TABLE challenge_phases ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies if they exist, then recreate them
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing policies for challenge_phases
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'challenge_phases' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON challenge_phases';
    END LOOP;
    
    -- Recreate the policies
    EXECUTE 'CREATE POLICY "Users can view their own challenges" ON challenge_phases FOR SELECT USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can insert their own challenges" ON challenge_phases FOR INSERT WITH CHECK (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can update their own challenges" ON challenge_phases FOR UPDATE USING (auth.uid() = user_id)';
    EXECUTE 'CREATE POLICY "Users can delete their own challenges" ON challenge_phases FOR DELETE USING (auth.uid() = user_id)';
    
    RAISE NOTICE 'Challenge phases policies recreated successfully';
END $$;

-- Step 7: Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_challenge_phases_updated_at') THEN
        CREATE TRIGGER update_challenge_phases_updated_at 
            BEFORE UPDATE ON challenge_phases 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'Updated_at trigger created';
    ELSE
        RAISE NOTICE 'Updated_at trigger already exists';
    END IF;
END $$;

-- Step 8: Test the table
SELECT 
  'Final Test' as check_type,
  COUNT(*) as total_challenges,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_challenges
FROM challenge_phases;

-- Step 9: Verify policies are in place
SELECT 
  'Policy Verification' as check_type,
  policyname,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'challenge_phases' 
AND schemaname = 'public'
ORDER BY policyname;
