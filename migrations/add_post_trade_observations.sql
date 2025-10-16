-- ============================================================
-- PHASE 2: POST-TRADE OBSERVATION TRACKING
-- ============================================================
-- Purpose: Track what price did AFTER trade closed
-- Enables: Continuation/reversal analysis, missed opportunity tracking
-- Date: 2024-10-16
-- ============================================================

-- Step 1: Create post_trade_observations table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.post_trade_observations (
  -- Primary key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Observation classification
  observation_type text NOT NULL CHECK (observation_type IN ('post_stop', 'post_target')),
  observation_time text NOT NULL, -- '15m', '1h', '4h', 'EOD', 'next_day'
  observed_at timestamptz DEFAULT now(),
  
  -- Price action after exit
  price_action text CHECK (price_action IN ('continuation', 'reversal', 'consolidation', 'unclear')),
  peak_price numeric(12,4), -- Highest (for longs/buy) or lowest (for shorts/sell) reached
  pips_moved numeric(10,2), -- How many pips from exit point
  r_moved numeric(6,3), -- How many R from original risk_amount (can be negative or positive)
  
  -- Optional context
  notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 2: Create indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_post_obs_trade_id ON public.post_trade_observations(trade_id);
CREATE INDEX IF NOT EXISTS idx_post_obs_user_id ON public.post_trade_observations(user_id);
CREATE INDEX IF NOT EXISTS idx_post_obs_type ON public.post_trade_observations(observation_type);
CREATE INDEX IF NOT EXISTS idx_post_obs_time ON public.post_trade_observations(observation_time);
CREATE INDEX IF NOT EXISTS idx_post_obs_action ON public.post_trade_observations(price_action);
CREATE INDEX IF NOT EXISTS idx_post_obs_observed_at ON public.post_trade_observations(observed_at);

-- Step 3: Enable Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.post_trade_observations ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- ============================================================

-- Users can only see and manage their own observations
CREATE POLICY "Users can view their own observations" 
  ON public.post_trade_observations 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own observations" 
  ON public.post_trade_observations 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own observations" 
  ON public.post_trade_observations 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own observations" 
  ON public.post_trade_observations 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Step 5: Add helpful comments
-- ============================================================

COMMENT ON TABLE public.post_trade_observations IS 'Tracks what price did after trade closed (continuation/reversal patterns)';
COMMENT ON COLUMN public.post_trade_observations.observation_type IS 'post_stop: After stop hit | post_target: After target hit';
COMMENT ON COLUMN public.post_trade_observations.observation_time IS 'When checked: 15m, 1h, 4h, EOD, next_day';
COMMENT ON COLUMN public.post_trade_observations.price_action IS 'continuation: Kept going same direction | reversal: Turned around | consolidation: Sideways';
COMMENT ON COLUMN public.post_trade_observations.peak_price IS 'Highest (longs) or lowest (shorts) price reached after exit';
COMMENT ON COLUMN public.post_trade_observations.pips_moved IS 'Pips moved from exit point (positive or negative)';
COMMENT ON COLUMN public.post_trade_observations.r_moved IS 'R-multiples from original risk_amount (can track missed opportunity)';

-- Step 6: Create helpful view for analytics
-- ============================================================

CREATE OR REPLACE VIEW public.v_trade_observations AS
SELECT 
  -- Trade data
  t.id as trade_id,
  t.user_id,
  t.asset,
  t.direction,
  t.setup_name,
  t.session,
  t.entry_price,
  t.stop_loss,
  t.exit_price,
  t.pnl,
  t.r_multiple,
  t.risk_amount,
  t.exit_reason,
  t.moved_to_be,
  t.efficiency,
  
  -- Observation data
  o.id as observation_id,
  o.observation_type,
  o.observation_time,
  o.observed_at,
  o.price_action,
  o.peak_price,
  o.pips_moved,
  o.r_moved,
  o.notes as observation_notes,
  
  -- Calculated insights
  CASE 
    WHEN o.observation_type = 'post_stop' AND o.price_action = 'reversal' THEN 'Good Stop Placement'
    WHEN o.observation_type = 'post_stop' AND o.price_action = 'continuation' THEN 'Stop Was Correct'
    WHEN o.observation_type = 'post_target' AND o.price_action = 'continuation' THEN 'Left R on Table'
    WHEN o.observation_type = 'post_target' AND o.price_action = 'reversal' THEN 'Good Exit Timing'
    ELSE 'Unclear'
  END as insight
  
FROM public.trades t
LEFT JOIN public.post_trade_observations o ON t.id = o.trade_id
WHERE t.status = 'closed';

-- Enable RLS on view
ALTER VIEW public.v_trade_observations SET (security_invoker = true);

-- Step 7: Create function to calculate R moved (helper)
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_r_moved(
  p_trade_id uuid,
  p_peak_price numeric,
  p_observation_type text
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_trade record;
  v_exit_price numeric;
  v_risk_amount numeric;
  v_direction text;
  v_price_diff numeric;
  v_asset text;
  v_pip_multiplier numeric;
  v_pips numeric;
  v_pip_value numeric;
  v_lot_size numeric;
  v_r_moved numeric;
BEGIN
  -- Get trade details
  SELECT 
    exit_price, 
    risk_amount, 
    direction, 
    asset,
    lot_size
  INTO v_trade
  FROM trades 
  WHERE id = p_trade_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  v_exit_price := v_trade.exit_price;
  v_risk_amount := v_trade.risk_amount;
  v_direction := v_trade.direction;
  v_asset := v_trade.asset;
  v_lot_size := COALESCE(v_trade.lot_size, 1.0);
  
  -- Get pip multiplier for asset
  v_pip_multiplier := CASE
    WHEN v_asset LIKE '%JPY%' THEN 0.01
    WHEN v_asset LIKE '%XAU%' OR v_asset LIKE '%GOLD%' THEN 0.1
    WHEN v_asset LIKE '%ES%' OR v_asset LIKE '%NQ%' THEN 1
    WHEN v_asset LIKE '%BTC%' OR v_asset LIKE '%ETH%' THEN 1
    ELSE 0.0001  -- Major FX pairs
  END;
  
  -- Get pip value per lot
  v_pip_value := CASE
    WHEN v_asset LIKE '%JPY%' THEN 9.0
    WHEN v_asset LIKE '%XAU%' OR v_asset LIKE '%GOLD%' THEN 10.0
    WHEN v_asset LIKE '%ES%' OR v_asset LIKE '%NQ%' THEN 50
    WHEN v_asset LIKE '%BTC%' OR v_asset LIKE '%ETH%' THEN 1
    ELSE 10.0  -- Major FX pairs
  END;
  
  -- Calculate price difference from exit
  IF v_direction IN ('long', 'buy') THEN
    v_price_diff := p_peak_price - v_exit_price;
  ELSE
    v_price_diff := v_exit_price - p_peak_price;
  END IF;
  
  -- Calculate pips
  v_pips := v_price_diff / v_pip_multiplier;
  
  -- Calculate R moved (in risk units)
  IF v_risk_amount > 0 THEN
    -- Calculate dollar value of the move
    v_r_moved := (v_pips * v_pip_value * v_lot_size) / v_risk_amount;
  ELSE
    v_r_moved := 0;
  END IF;
  
  RETURN ROUND(v_r_moved::numeric, 3);
END;
$$;

COMMENT ON FUNCTION public.calculate_r_moved IS 'Calculate R-multiples moved from exit point (for observation tracking)';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Verify table created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'post_trade_observations') as column_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'post_trade_observations';

-- Expected: 1 row, ~15 columns

-- Verify indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'post_trade_observations';

-- Expected: 6 indexes

-- Verify RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'post_trade_observations';

-- Expected: rowsecurity = true

