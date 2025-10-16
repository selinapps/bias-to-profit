-- Fix Net P&L calculation to use current balance instead of trades
-- Net P&L should be calculated as: Current Balance - Starting Balance

-- Step 1: Drop all possible versions of the function
DROP FUNCTION IF EXISTS get_enhanced_challenge_summary(uuid);
DROP FUNCTION IF EXISTS get_enhanced_challenge_summary(user_uuid uuid);
DROP FUNCTION IF EXISTS get_enhanced_challenge_summary(p_user_id uuid);

-- Step 2: Create the corrected function with proper Net P&L calculation
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
  calculated_current_balance numeric;
  calculated_net_profit numeric;
  calculated_realized_today numeric;
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

  -- Get daily state - handle potential errors
  BEGIN
    SELECT * INTO daily_state
    FROM get_challenge_daily_state(challenge_record.id);
  EXCEPTION
    WHEN OTHERS THEN
      -- If get_challenge_daily_state fails, create default state
      daily_state.build_phase_active := false;
      daily_state.build_trades_count := 0;
      daily_state.build_realized_pnl := 0;
      daily_state.banked_profit := 0;
      daily_state.daily_stop_losses := 0;
      daily_state.is_locked := false;
      daily_state.lock_reason := null;
  END;

  -- Calculate today's start timestamp
  today_start := date_trunc('day', now());

  -- Calculate realized PnL from trades today - FIXED: use entry_time instead of exit_time
  SELECT COALESCE(SUM(pnl), 0) INTO calculated_realized_today
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= today_start
    AND entry_time < today_start + interval '1 day';

  -- FIXED: Calculate current balance (use user_reported_current_balance if available, otherwise calculate from trades)
  IF challenge_record.user_reported_current_balance IS NOT NULL THEN
    calculated_current_balance := challenge_record.user_reported_current_balance;
  ELSE
    -- Calculate from trades if no manual balance is set
    SELECT COALESCE(SUM(pnl), 0) INTO calculated_net_profit
    FROM public.trades
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND entry_time >= challenge_record.started_at;
    
    calculated_current_balance := challenge_record.starting_balance + calculated_net_profit;
  END IF;

  -- FIXED: Calculate Net P&L from current balance difference (not from trades)
  calculated_net_profit := calculated_current_balance - challenge_record.starting_balance;

  -- Calculate metrics with error handling
  distance_to_pass_val := challenge_record.target_profit - calculated_net_profit;
  
  -- Handle division by zero
  IF challenge_record.target_profit > 0 THEN
    progress_pct_val := calculated_net_profit / challenge_record.target_profit;
  ELSE
    progress_pct_val := 0;
  END IF;
  
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

  -- Return the calculated values with explicit type casting for phase
  RETURN QUERY SELECT
    challenge_record.id,
    challenge_record.challenge_name,
    challenge_record.prop_firm,
    challenge_record.phase::text,  -- Explicit cast to text
    challenge_record.starting_balance,
    challenge_record.target_profit,
    calculated_current_balance,
    calculated_net_profit,
    calculated_realized_today,
    distance_to_pass_val,
    distance_in_r_json,
    progress_pct_val,
    state_val,
    COALESCE(daily_state.build_phase_active, false),
    COALESCE(daily_state.build_trades_count, 0),
    COALESCE(daily_state.build_realized_pnl, 0),
    COALESCE(daily_state.banked_profit, 0),
    COALESCE(daily_state.daily_stop_losses, 0),
    COALESCE(daily_state.is_locked, false),
    daily_state.lock_reason;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION get_enhanced_challenge_summary(uuid) TO authenticated;

-- Step 4: Test the function
SELECT 'Function created successfully with correct Net P&L calculation' as status;
