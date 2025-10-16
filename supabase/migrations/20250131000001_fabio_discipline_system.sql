-- Fabio Discipline System Migration
-- Implements Build/Bank/Stop rules with multi-challenge support

-- ============================================================================
-- 1. ENHANCE CHALLENGE_PHASES TABLE
-- ============================================================================

-- Add new columns to support Fabio discipline system
ALTER TABLE public.challenge_phases ADD COLUMN IF NOT EXISTS challenge_name text;
ALTER TABLE public.challenge_phases ADD COLUMN IF NOT EXISTS build_phase_active boolean DEFAULT true;
ALTER TABLE public.challenge_phases ADD COLUMN IF NOT EXISTS build_trades_count integer DEFAULT 0;
ALTER TABLE public.challenge_phases ADD COLUMN IF NOT EXISTS build_realized_pnl numeric(18,2) DEFAULT 0;
ALTER TABLE public.challenge_phases ADD COLUMN IF NOT EXISTS banked_profit numeric(18,2) DEFAULT 0;
ALTER TABLE public.challenge_phases ADD COLUMN IF NOT EXISTS daily_stop_losses integer DEFAULT 0;
ALTER TABLE public.challenge_phases ADD COLUMN IF NOT EXISTS last_reset_date date DEFAULT CURRENT_DATE;
ALTER TABLE public.challenge_phases ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;
ALTER TABLE public.challenge_phases ADD COLUMN IF NOT EXISTS lock_reason text;

-- Update existing challenges to have default challenge names
UPDATE public.challenge_phases 
SET challenge_name = CONCAT(prop_firm, ' - Phase ', phase)
WHERE challenge_name IS NULL;

-- ============================================================================
-- 2. ADD CHALLENGE_ID TO TRADES TABLE
-- ============================================================================

-- Add challenge_id column to trades table
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS challenge_id uuid REFERENCES public.challenge_phases(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trades_challenge_id ON public.trades(challenge_id);

-- ============================================================================
-- 3. CREATE DAILY CHALLENGE STATE TABLE
-- ============================================================================

-- Track daily state for each challenge
CREATE TABLE IF NOT EXISTS public.challenge_daily_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenge_phases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_key date NOT NULL,
  
  -- Build phase tracking
  build_phase_active boolean DEFAULT true,
  build_trades_count integer DEFAULT 0,
  build_realized_pnl numeric(18,2) DEFAULT 0,
  
  -- Banking tracking
  banked_profit numeric(18,2) DEFAULT 0,
  banking_triggered boolean DEFAULT false,
  
  -- Stop loss tracking
  daily_stop_losses integer DEFAULT 0,
  is_locked boolean DEFAULT false,
  lock_reason text,
  
  -- Daily totals
  realized_pnl numeric(18,2) DEFAULT 0,
  total_trades integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(challenge_id, date_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_challenge_daily_state_challenge_id ON public.challenge_daily_state(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_daily_state_user_id ON public.challenge_daily_state(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_daily_state_date ON public.challenge_daily_state(date_key);

-- ============================================================================
-- 4. CREATE FABIO DISCIPLINE FUNCTIONS
-- ============================================================================

-- Function to get current challenge daily state
CREATE OR REPLACE FUNCTION get_challenge_daily_state(p_challenge_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  challenge_id uuid,
  date_key date,
  build_phase_active boolean,
  build_trades_count integer,
  build_realized_pnl numeric,
  banked_profit numeric,
  banking_triggered boolean,
  daily_stop_losses integer,
  is_locked boolean,
  lock_reason text,
  realized_pnl numeric,
  total_trades integer
) AS $$
DECLARE
  daily_state RECORD;
  today_start timestamptz;
  today_end timestamptz;
BEGIN
  -- Calculate day boundaries
  today_start := p_date::timestamptz;
  today_end := today_start + interval '1 day';
  
  -- Get or create daily state
  SELECT * INTO daily_state
  FROM public.challenge_daily_state
  WHERE challenge_id = p_challenge_id AND date_key = p_date;
  
  -- If no daily state exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.challenge_daily_state (challenge_id, user_id, date_key)
    SELECT p_challenge_id, user_id, p_date
    FROM public.challenge_phases
    WHERE id = p_challenge_id;
    
    -- Get the newly created state
    SELECT * INTO daily_state
    FROM public.challenge_daily_state
    WHERE challenge_id = p_challenge_id AND date_key = p_date;
  END IF;
  
  -- Calculate real-time values from trades
  WITH trade_stats AS (
    SELECT 
      COUNT(*) as total_trades,
      COALESCE(SUM(CASE WHEN status = 'closed' THEN pnl ELSE 0 END), 0) as realized_pnl,
      COALESCE(SUM(CASE WHEN status = 'closed' AND pnl < 0 THEN 1 ELSE 0 END), 0) as stop_losses
    FROM public.trades
    WHERE challenge_id = p_challenge_id
      AND entry_time >= today_start
      AND entry_time < today_end
  )
  UPDATE public.challenge_daily_state
  SET 
    total_trades = trade_stats.total_trades,
    realized_pnl = trade_stats.realized_pnl,
    daily_stop_losses = trade_stats.stop_losses,
    updated_at = now()
  FROM trade_stats
  WHERE challenge_id = p_challenge_id AND date_key = p_date;
  
  -- Return the updated state
  RETURN QUERY
  SELECT * FROM public.challenge_daily_state
  WHERE challenge_id = p_challenge_id AND date_key = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate trade against Fabio rules
CREATE OR REPLACE FUNCTION validate_fabio_trade(
  p_challenge_id uuid,
  p_risk_amount numeric,
  p_target_price numeric,
  p_entry_price numeric,
  p_stop_loss numeric
)
RETURNS TABLE (
  is_valid boolean,
  error_message text,
  warning_message text
) AS $$
DECLARE
  challenge_record RECORD;
  daily_state RECORD;
  risk_per_trade numeric;
  distance_to_pass numeric;
  max_risk_allowed numeric;
  r_multiple numeric;
BEGIN
  -- Get challenge details
  SELECT * INTO challenge_record
  FROM public.challenge_phases
  WHERE id = p_challenge_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Challenge not found or not active', null;
    RETURN;
  END IF;
  
  -- Get daily state
  SELECT * INTO daily_state
  FROM get_challenge_daily_state(p_challenge_id);
  
  -- Check if challenge is locked
  IF daily_state.is_locked THEN
    RETURN QUERY SELECT false, 'Challenge locked: ' || COALESCE(daily_state.lock_reason, '3 stop losses hit'), null;
    RETURN;
  END IF;
  
  -- Check Build Phase rules
  IF daily_state.build_phase_active THEN
    -- Check if Build phase should end
    IF daily_state.build_trades_count >= 3 OR daily_state.build_realized_pnl <= -1500 THEN
      -- End Build phase
      UPDATE public.challenge_daily_state
      SET build_phase_active = false, updated_at = now()
      WHERE challenge_id = p_challenge_id AND date_key = CURRENT_DATE;
      
      -- Check for banking trigger
      IF daily_state.build_realized_pnl > 1000 THEN
        UPDATE public.challenge_daily_state
        SET 
          banked_profit = FLOOR(daily_state.build_realized_pnl / 2),
          banking_triggered = true,
          updated_at = now()
        WHERE challenge_id = p_challenge_id AND date_key = CURRENT_DATE;
      END IF;
    ELSE
      -- Still in Build phase - check risk limits
      IF p_risk_amount NOT IN (250, 500) THEN
        RETURN QUERY SELECT false, 'Build Phase: Risk must be $250 or $500 only', null;
        RETURN;
      END IF;
    END IF;
  END IF;
  
  -- Check banking protection
  IF daily_state.banked_profit > 0 THEN
    -- Calculate if trade would breach banked profit
    IF (daily_state.realized_pnl + p_risk_amount) < daily_state.banked_profit THEN
      RETURN QUERY SELECT false, 'Cannot risk below banked profit of $' || daily_state.banked_profit, null;
      RETURN;
    END IF;
  END IF;
  
  -- Check Anti-Hero trade gate
  distance_to_pass := challenge_record.target_profit - (challenge_record.starting_balance + daily_state.realized_pnl - challenge_record.starting_balance);
  r_multiple := ABS(p_target_price - p_entry_price) / ABS(p_entry_price - p_stop_loss);
  
  IF distance_to_pass > (2.5 * p_risk_amount) AND r_multiple > 2.5 THEN
    RETURN QUERY SELECT false, 'Anti-Hero Trade: Target exceeds safe size. Break goal into normal trades.', null;
    RETURN;
  END IF;
  
  -- All validations passed
  RETURN QUERY SELECT true, null, null;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process trade completion and update daily state
CREATE OR REPLACE FUNCTION process_trade_completion(
  p_trade_id uuid
)
RETURNS void AS $$
DECLARE
  trade_record RECORD;
  daily_state RECORD;
  new_build_trades_count integer;
  new_build_realized_pnl numeric;
  new_daily_stop_losses integer;
  should_end_build boolean := false;
  should_trigger_banking boolean := false;
BEGIN
  -- Get trade details
  SELECT t.*, cp.id as challenge_id
  INTO trade_record
  FROM public.trades t
  LEFT JOIN public.challenge_phases cp ON t.challenge_id = cp.id
  WHERE t.id = p_trade_id AND t.status = 'closed';
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get current daily state
  SELECT * INTO daily_state
  FROM get_challenge_daily_state(trade_record.challenge_id);
  
  -- Update counters
  new_build_trades_count := daily_state.build_trades_count;
  new_build_realized_pnl := daily_state.build_realized_pnl;
  new_daily_stop_losses := daily_state.daily_stop_losses;
  
  -- Update build phase counters if still in build phase
  IF daily_state.build_phase_active THEN
    new_build_trades_count := new_build_trades_count + 1;
    new_build_realized_pnl := new_build_realized_pnl + trade_record.pnl;
    
    -- Check if build phase should end
    should_end_build := (new_build_trades_count >= 3) OR (new_build_realized_pnl <= -1500);
    
    -- Check for banking trigger
    should_trigger_banking := (new_build_realized_pnl > 1000) AND NOT daily_state.banking_triggered;
  END IF;
  
  -- Count stop losses
  IF trade_record.pnl < 0 THEN
    new_daily_stop_losses := new_daily_stop_losses + 1;
  END IF;
  
  -- Update daily state
  UPDATE public.challenge_daily_state
  SET 
    build_trades_count = new_build_trades_count,
    build_realized_pnl = new_build_realized_pnl,
    daily_stop_losses = new_daily_stop_losses,
    build_phase_active = CASE WHEN should_end_build THEN false ELSE build_phase_active END,
    banked_profit = CASE 
      WHEN should_trigger_banking THEN FLOOR(new_build_realized_pnl / 2)
      ELSE banked_profit 
    END,
    banking_triggered = CASE 
      WHEN should_trigger_banking THEN true
      ELSE banking_triggered 
    END,
    is_locked = CASE 
      WHEN new_daily_stop_losses >= 3 THEN true
      ELSE is_locked 
    END,
    lock_reason = CASE 
      WHEN new_daily_stop_losses >= 3 THEN '3 stop losses hit - locked until tomorrow'
      ELSE lock_reason 
    END,
    updated_at = now()
  WHERE challenge_id = trade_record.challenge_id AND date_key = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CREATE TRIGGERS
-- ============================================================================

-- Trigger to process trade completion
CREATE OR REPLACE FUNCTION trigger_process_trade_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when trade is closed and has PnL
  IF NEW.status = 'closed' AND NEW.pnl IS NOT NULL AND OLD.status != 'closed' THEN
    PERFORM process_trade_completion(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_trade_completion ON public.trades;
CREATE TRIGGER trigger_trade_completion
  AFTER UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_trade_completion();

-- ============================================================================
-- 6. ENABLE RLS AND PERMISSIONS
-- ============================================================================

-- Enable RLS on new table
ALTER TABLE public.challenge_daily_state ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own challenge daily states" ON public.challenge_daily_state
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenge daily states" ON public.challenge_daily_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge daily states" ON public.challenge_daily_state
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.challenge_daily_state TO authenticated;
GRANT EXECUTE ON FUNCTION get_challenge_daily_state(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_fabio_trade(uuid, numeric, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION process_trade_completion(uuid) TO authenticated;

-- ============================================================================
-- 7. CREATE ENHANCED CHALLENGE SUMMARY FUNCTION
-- ============================================================================

-- Enhanced function to get challenge summary with Fabio discipline data
CREATE OR REPLACE FUNCTION get_enhanced_challenge_summary(p_user_id uuid)
RETURNS TABLE (
  phase_id uuid,
  challenge_name text,
  prop_firm text,
  phase text,
  starting_balance numeric,
  target_profit numeric,
  current_balance numeric,
  net_profit numeric,
  realized_today numeric,
  distance_to_pass numeric,
  distance_in_r jsonb,
  progress_pct numeric,
  state text,
  build_phase_active boolean,
  build_trades_count integer,
  build_realized_pnl numeric,
  banked_profit numeric,
  daily_stop_losses integer,
  is_locked boolean,
  lock_reason text
) AS $$
DECLARE
  challenge_record RECORD;
  daily_state RECORD;
  today_start timestamptz;
  calculated_net_profit numeric;
  calculated_current_balance numeric;
  distance_to_pass_val numeric;
  progress_pct_val numeric;
  state_val text;
  distance_in_r_json jsonb;
BEGIN
  -- Get the active challenge for the user
  SELECT * INTO challenge_record
  FROM public.challenge_phases
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  -- If no active challenge, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get daily state
  SELECT * INTO daily_state
  FROM get_challenge_daily_state(challenge_record.id);

  -- Calculate today's start timestamp
  today_start := date_trunc('day', now());

  -- Calculate realized PnL from trades today
  SELECT COALESCE(SUM(pnl), 0) INTO challenge_record.realized_today
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND exit_time >= today_start
    AND exit_time < today_start + interval '1 day';

  -- Calculate net profit from trades since challenge start
  SELECT COALESCE(SUM(pnl), 0) INTO calculated_net_profit
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND exit_time >= challenge_record.started_at;

  -- Determine current balance
  IF challenge_record.user_reported_current_balance IS NOT NULL THEN
    calculated_current_balance := challenge_record.user_reported_current_balance;
  ELSE
    calculated_current_balance := challenge_record.starting_balance + calculated_net_profit;
  END IF;

  -- Calculate metrics
  distance_to_pass_val := challenge_record.target_profit - calculated_net_profit;
  progress_pct_val := (calculated_current_balance - challenge_record.starting_balance) / challenge_record.target_profit;
  
  -- Determine state
  IF calculated_current_balance >= challenge_record.starting_balance + challenge_record.target_profit THEN
    state_val := 'PASSED';
  ELSE
    state_val := 'ACTIVE';
  END IF;

  -- Calculate distance in R for different risk amounts
  distance_in_r_json := jsonb_build_array(
    jsonb_build_object('risk', 250, 'rLeft', CASE WHEN 250 > 0 THEN distance_to_pass_val / 250 ELSE 0 END),
    jsonb_build_object('risk', 500, 'rLeft', CASE WHEN 500 > 0 THEN distance_to_pass_val / 500 ELSE 0 END),
    jsonb_build_object('risk', 1000, 'rLeft', CASE WHEN 1000 > 0 THEN distance_to_pass_val / 1000 ELSE 0 END)
  );

  -- Return the calculated values
  RETURN QUERY SELECT
    challenge_record.id,
    challenge_record.challenge_name,
    challenge_record.prop_firm,
    challenge_record.phase,
    challenge_record.starting_balance,
    challenge_record.target_profit,
    calculated_current_balance,
    calculated_net_profit,
    challenge_record.realized_today,
    distance_to_pass_val,
    distance_in_r_json,
    progress_pct_val,
    state_val,
    daily_state.build_phase_active,
    daily_state.build_trades_count,
    daily_state.build_realized_pnl,
    daily_state.banked_profit,
    daily_state.daily_stop_losses,
    daily_state.is_locked,
    daily_state.lock_reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for enhanced function
GRANT EXECUTE ON FUNCTION get_enhanced_challenge_summary(uuid) TO authenticated;
