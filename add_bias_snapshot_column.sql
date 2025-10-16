-- Migration: Add bias_snapshot column to trades table
-- Description: Stores bias state context at the time of trade entry
-- Date: 2025-10-15

-- Add bias_snapshot column (stores bias context as JSONB)
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS bias_snapshot JSONB;

-- Add comment to bias_snapshot column
COMMENT ON COLUMN trades.bias_snapshot IS 'Bias state snapshot at time of trade entry (bias, market_state, session, etc.)';

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'trades' 
  AND column_name = 'bias_snapshot';

