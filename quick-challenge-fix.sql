-- ============================================
-- QUICK FIX FOR CHALLENGE_PHASES TABLE
-- ============================================

-- Step 1: Check if challenge_phases table exists
SELECT 
  'Table Check' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenge_phases' AND table_schema = 'public') 
    THEN 'challenge_phases table exists ✅' 
    ELSE 'challenge_phases table missing ❌' 
  END as status;

-- Step 2: Create challenge_phases table if it doesn't exist
CREATE TABLE IF NOT EXISTS challenge_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_name TEXT NOT NULL DEFAULT 'Funded Hive - Phase 1',
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

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_challenge_phases_user_id ON challenge_phases(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_phases_status ON challenge_phases(status);
CREATE INDEX IF NOT EXISTS idx_challenge_phases_user_status ON challenge_phases(user_id, status);

-- Step 4: Enable RLS
ALTER TABLE challenge_phases ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'challenge_phases' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON challenge_phases';
    END LOOP;
END $$;

-- Step 6: Create RLS policies
CREATE POLICY "Users can view their own challenges" ON challenge_phases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges" ON challenge_phases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges" ON challenge_phases
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenges" ON challenge_phases
    FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Test the table
SELECT 'challenge_phases table created and configured successfully' as status;

-- Step 8: Test a simple query
SELECT 
  'Test Query' as check_type,
  COUNT(*) as total_challenges
FROM challenge_phases;
