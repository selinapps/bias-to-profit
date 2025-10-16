-- ============================================
-- CREATE CHALLENGE_PHASES TABLE
-- ============================================

-- Create challenge_phases table if it doesn't exist
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_challenge_phases_user_id ON challenge_phases(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_phases_status ON challenge_phases(status);
CREATE INDEX IF NOT EXISTS idx_challenge_phases_user_status ON challenge_phases(user_id, status);

-- Enable RLS
ALTER TABLE challenge_phases ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own challenges" ON challenge_phases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges" ON challenge_phases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenges" ON challenge_phases
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own challenges" ON challenge_phases
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_challenge_phases_updated_at 
    BEFORE UPDATE ON challenge_phases 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Test the table
SELECT 'challenge_phases table created successfully' as status;
