-- Add trade lessons and good actions fields to trades table
-- These fields will help traders reflect on their performance and learn from each trade

-- Add trade_lessons column for detailed reflection
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS trade_lessons text;

-- Add good_actions array for tracking what went well
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS good_actions text[] DEFAULT '{}';

-- Add comment to describe the new columns
COMMENT ON COLUMN public.trades.trade_lessons IS 'Detailed reflection and lessons learned from the trade';
COMMENT ON COLUMN public.trades.good_actions IS 'Array of positive actions taken during the trade';

-- Create index for searching lessons (useful for future analytics)
CREATE INDEX IF NOT EXISTS idx_trades_lessons ON public.trades USING gin(to_tsvector('english', trade_lessons)) 
WHERE trade_lessons IS NOT NULL;
