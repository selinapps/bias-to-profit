-- ============================================
-- CREATE BIAS_STATE TABLE AND FIX ISSUES
-- ============================================

-- Step 1: Create bias_state table if it doesn't exist
CREATE TABLE IF NOT EXISTS bias_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_key DATE NOT NULL,
  bias TEXT NOT NULL CHECK (bias IN ('OOB_LONG', 'OOB_SHORT', 'MR_LONG', 'MR_SHORT', 'FLAT')),
  market_state TEXT CHECK (market_state IN ('OUT_OF_BALANCE', 'IN_BALANCE', 'FAILED_BREAK', 'UNCLEAR')),
  confidence TEXT CHECK (confidence IN ('LOW', 'MEDIUM', 'HIGH')),
  tags TEXT[],
  active BOOLEAN DEFAULT true,
  selected_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bias_state_day_key ON bias_state(day_key);
CREATE INDEX IF NOT EXISTS idx_bias_state_selected_by ON bias_state(selected_by);
CREATE INDEX IF NOT EXISTS idx_bias_state_active ON bias_state(active);

-- Step 3: Enable RLS
ALTER TABLE bias_state ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for bias_state
CREATE POLICY "Users can view their own bias states" ON bias_state
    FOR SELECT USING (auth.uid() = selected_by);

CREATE POLICY "Users can insert their own bias states" ON bias_state
    FOR INSERT WITH CHECK (auth.uid() = selected_by);

CREATE POLICY "Users can update their own bias states" ON bias_state
    FOR UPDATE USING (auth.uid() = selected_by);

CREATE POLICY "Users can delete their own bias states" ON bias_state
    FOR DELETE USING (auth.uid() = selected_by);

-- Step 5: Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bias_state_updated_at 
    BEFORE UPDATE ON bias_state 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Test the table
SELECT 'bias_state table created successfully' as status;

-- Step 7: Check if we can insert a test record
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Try to insert a test record
        INSERT INTO bias_state (day_key, bias, selected_by)
        VALUES (CURRENT_DATE, 'FLAT', test_user_id)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Test insert successful for user: %', test_user_id;
    ELSE
        RAISE NOTICE 'No users found for testing';
    END IF;
END $$;
