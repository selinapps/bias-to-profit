-- ============================================
-- TRADE LESSONS & IMPROVEMENTS MIGRATION
-- ============================================
-- Run this in your Supabase SQL Editor to add trade reflection features
-- This adds the ability to log lessons, mistakes, and good actions when closing trades

-- Step 1: Add trade_lessons column for detailed reflection
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS trade_lessons text;

-- Step 2: Add good_actions array for tracking what went well
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS good_actions text[] DEFAULT '{}';

-- Step 3: Add helpful comments to the columns
COMMENT ON COLUMN public.trades.trade_lessons IS 'Detailed reflection and lessons learned from the trade';
COMMENT ON COLUMN public.trades.good_actions IS 'Array of positive actions taken during the trade';

-- Step 4: Create search index for lessons (useful for future analytics)
CREATE INDEX IF NOT EXISTS idx_trades_lessons ON public.trades 
USING gin(to_tsvector('english', trade_lessons)) 
WHERE trade_lessons IS NOT NULL;

-- Step 5: Verify the changes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'trade_lessons'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'trades' AND column_name = 'good_actions'
  ) THEN
    RAISE NOTICE '✅ Migration successful! Trade lessons fields added.';
  ELSE
    RAISE NOTICE '⚠️ Migration may have failed. Please check the logs.';
  END IF;
END $$;

-- Optional: View updated table structure
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'trades'
  AND column_name IN ('trade_lessons', 'good_actions')
ORDER BY ordinal_position;
