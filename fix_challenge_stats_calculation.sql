-- Fix challenge stats calculation issues
-- This migration fixes the incorrect date filtering in challenge summary functions

-- 1. Fix get_enhanced_challenge_summary function to use entry_time instead of exit_time
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

  -- Calculate realized PnL from trades today - FIXED: use entry_time instead of exit_time
  SELECT COALESCE(SUM(pnl), 0) INTO challenge_record.realized_today
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= today_start
    AND entry_time < today_start + interval '1 day';

  -- Calculate net profit from trades since challenge start - FIXED: use entry_time instead of exit_time
  SELECT COALESCE(SUM(pnl), 0) INTO calculated_net_profit
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= challenge_record.started_at;

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

-- Grant permission for the fixed function
GRANT EXECUTE ON FUNCTION get_enhanced_challenge_summary(uuid) TO authenticated;

-- 2. Also fix any other functions that might be using exit_time incorrectly
-- Check if there are other functions that need similar fixes

-- 3. Create a diagnostic function to help debug challenge stats
CREATE OR REPLACE FUNCTION debug_challenge_stats(p_user_id uuid)
RETURNS TABLE (
  metric_name text,
  value numeric,
  description text
) AS $$
DECLARE
  challenge_record RECORD;
  today_start timestamptz;
  today_trades_entry numeric;
  today_trades_exit numeric;
  total_trades_entry numeric;
  total_trades_exit numeric;
BEGIN
  -- Get the active challenge for the user
  SELECT * INTO challenge_record
  FROM public.challenge_phases
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'ERROR'::text, 0::numeric, 'No active challenge found'::text;
    RETURN;
  END IF;

  today_start := date_trunc('day', now());

  -- Calculate today's P&L using entry_time
  SELECT COALESCE(SUM(pnl), 0) INTO today_trades_entry
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= today_start
    AND entry_time < today_start + interval '1 day';

  -- Calculate today's P&L using exit_time (for comparison)
  SELECT COALESCE(SUM(pnl), 0) INTO today_trades_exit
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND exit_time >= today_start
    AND exit_time < today_start + interval '1 day';

  -- Calculate total P&L using entry_time
  SELECT COALESCE(SUM(pnl), 0) INTO total_trades_entry
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= challenge_record.started_at;

  -- Calculate total P&L using exit_time (for comparison)
  SELECT COALESCE(SUM(pnl), 0) INTO total_trades_exit
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND exit_time >= challenge_record.started_at;

  -- Return diagnostic data
  RETURN QUERY VALUES
    ('Today P&L (entry_time)', today_trades_entry, 'Today P&L calculated using entry_time'),
    ('Today P&L (exit_time)', today_trades_exit, 'Today P&L calculated using exit_time'),
    ('Total P&L (entry_time)', total_trades_entry, 'Total P&L calculated using entry_time'),
    ('Total P&L (exit_time)', total_trades_exit, 'Total P&L calculated using exit_time'),
    ('Starting Balance', challenge_record.starting_balance, 'Challenge starting balance'),
    ('Target Profit', challenge_record.target_profit, 'Challenge target profit'),
    ('Current Balance', COALESCE(challenge_record.user_reported_current_balance, challenge_record.starting_balance + total_trades_entry), 'Current balance calculation');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission for diagnostic function
GRANT EXECUTE ON FUNCTION debug_challenge_stats(uuid) TO authenticated;

-- 4. Add comment explaining the fix
COMMENT ON FUNCTION get_enhanced_challenge_summary(uuid) IS 
'Enhanced challenge summary function - FIXED: Now uses entry_time instead of exit_time for date filtering to ensure consistent calculations with the rest of the application';
