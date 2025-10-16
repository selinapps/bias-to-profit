-- ============================================================
-- COMPLETE TRADES TABLE SCHEMA REMAP
-- ============================================================
-- Purpose: Comprehensive remapping of trades table for manual workflow
-- All fields are nullable by default to prevent crashes
-- Date: 2024-10-16
-- ============================================================

-- Step 1: Add new fields for ENTRY STAGE
-- ============================================================

-- Core Setup Fields (replacing fragmented approach)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS setup_name text;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS target_price numeric(12,4);
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS session text; -- Replaces trading_session

-- Manual Market Context Fields
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS atr_pips numeric(10,2);
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS spread numeric(10,2);
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS slippage numeric(10,2);
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS account_equity numeric(12,2);

-- Psychology & Discipline Fields
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS confidence integer; -- 1-5 scale
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS checklist_passed boolean;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS discipline_tag text;

-- Change bias_snapshot from jsonb to text for manual entry
ALTER TABLE public.trades ALTER COLUMN bias_snapshot TYPE text USING bias_snapshot::text;

-- Step 2: Add new fields for CLOSE/MANAGE STAGE
-- ============================================================

-- MAE/MFE Analytics (manual entry)
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mae_r numeric(10,3); -- Max Adverse Excursion in R
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS mfe_r numeric(10,3); -- Max Favorable Excursion in R
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS efficiency numeric(6,3); -- Calculated: r_multiple / mfe_r

-- Trade Management Actions
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS moved_to_be boolean DEFAULT false;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS be_trigger_r numeric(6,2); -- At what R moved to BE
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS partial_at_2r boolean DEFAULT false;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS used_trailing_stop boolean DEFAULT false;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS orderflow_exit boolean DEFAULT false;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS exit_reason text; -- "Target hit", "Stop hit", "Manual exit", etc.

-- Step 3: Migrate existing data to new fields
-- ============================================================

-- Migrate locations[0] to setup_name
UPDATE public.trades 
SET setup_name = locations[1] 
WHERE locations IS NOT NULL AND array_length(locations, 1) > 0 AND setup_name IS NULL;

-- Migrate trading_session to session
UPDATE public.trades 
SET session = trading_session 
WHERE trading_session IS NOT NULL AND session IS NULL;

-- Step 4: Update constraints and checks
-- ============================================================

-- Update direction constraint to allow "buy"/"sell" AND keep "long"/"short" for backward compatibility
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_direction_check;
ALTER TABLE public.trades ADD CONSTRAINT trades_direction_check 
  CHECK (direction IN ('long', 'short', 'buy', 'sell'));

-- Add confidence range check (1-5)
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_confidence_check;
ALTER TABLE public.trades ADD CONSTRAINT trades_confidence_check 
  CHECK (confidence IS NULL OR (confidence >= 1 AND confidence <= 5));

-- Add efficiency range check (0-1)
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_efficiency_check;
ALTER TABLE public.trades ADD CONSTRAINT trades_efficiency_check 
  CHECK (efficiency IS NULL OR (efficiency >= 0 AND efficiency <= 1));

-- Step 5: Create indexes for new fields
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_trades_setup_name ON public.trades(setup_name);
CREATE INDEX IF NOT EXISTS idx_trades_session ON public.trades(session);
CREATE INDEX IF NOT EXISTS idx_trades_exit_reason ON public.trades(exit_reason);
CREATE INDEX IF NOT EXISTS idx_trades_discipline_tag ON public.trades(discipline_tag);
CREATE INDEX IF NOT EXISTS idx_trades_efficiency ON public.trades(efficiency) WHERE efficiency IS NOT NULL;

-- Step 6: Add helpful comments to document fields
-- ============================================================

COMMENT ON COLUMN public.trades.setup_name IS 'User-selected setup name (replaces locations[0])';
COMMENT ON COLUMN public.trades.target_price IS 'Planned target at entry (separate from exit_price)';
COMMENT ON COLUMN public.trades.session IS 'Trading session: London, New York, Asia, etc.';
COMMENT ON COLUMN public.trades.atr_pips IS 'Manual entry: ATR in pips at trade entry';
COMMENT ON COLUMN public.trades.spread IS 'Manual entry: Spread in pips';
COMMENT ON COLUMN public.trades.slippage IS 'Manual entry: Slippage in pips';
COMMENT ON COLUMN public.trades.account_equity IS 'Manual entry: Account equity at trade entry';
COMMENT ON COLUMN public.trades.confidence IS 'Trade confidence: 1 (low) to 5 (high)';
COMMENT ON COLUMN public.trades.checklist_passed IS 'Did trade pass pre-trade checklist?';
COMMENT ON COLUMN public.trades.discipline_tag IS 'Discipline classification: followed_plan, FOMO, revenge, etc.';
COMMENT ON COLUMN public.trades.bias_snapshot IS 'Manual entry: Market bias context (text)';
COMMENT ON COLUMN public.trades.mae_r IS 'Manual entry: Max Adverse Excursion in R';
COMMENT ON COLUMN public.trades.mfe_r IS 'Manual entry: Max Favorable Excursion in R';
COMMENT ON COLUMN public.trades.efficiency IS 'Calculated: r_multiple / mfe_r (capped at 1.0)';
COMMENT ON COLUMN public.trades.moved_to_be IS 'Was stop moved to breakeven?';
COMMENT ON COLUMN public.trades.be_trigger_r IS 'At what R was stop moved to BE?';
COMMENT ON COLUMN public.trades.partial_at_2r IS 'Was partial profit taken at 2R?';
COMMENT ON COLUMN public.trades.used_trailing_stop IS 'Was trailing stop used?';
COMMENT ON COLUMN public.trades.orderflow_exit IS 'Exit based on orderflow/price action?';
COMMENT ON COLUMN public.trades.exit_reason IS 'Exit reason: Target hit, Stop hit, Manual exit, etc.';

-- Step 7: DEPRECATED FIELDS (keep for safe migration, remove later)
-- ============================================================
COMMENT ON COLUMN public.trades.model IS 'DEPRECATED: Use setup_name instead';
COMMENT ON COLUMN public.trades.locations IS 'DEPRECATED: Use setup_name instead';
COMMENT ON COLUMN public.trades.aggression IS 'DEPRECATED: No longer used';
COMMENT ON COLUMN public.trades.scenarios IS 'DEPRECATED: No longer used';
COMMENT ON COLUMN public.trades.trading_session IS 'DEPRECATED: Use session instead';
COMMENT ON COLUMN public.trades.hypothesis_id IS 'DEPRECATED: No longer used';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Verify new structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'trades'
ORDER BY ordinal_position;

