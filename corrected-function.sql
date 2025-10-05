-- CORRECTED FUNCTION - Fixed calculation formulas

-- Drop the problematic function
DROP FUNCTION IF EXISTS get_challenge_summary(uuid);

-- Create the corrected function with proper calculations
CREATE OR REPLACE FUNCTION get_challenge_summary(p_user_id uuid)
RETURNS TABLE (
  phase_id uuid,
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
  state text
) AS $$
DECLARE
  challenge_record RECORD;
  today_start timestamptz;
  calculated_net_profit numeric;
  calculated_current_balance numeric;
  distance_to_pass_val numeric;
  progress_pct_val numeric;
  state_val text;
  distance_in_r_json jsonb;
  realized_today_val numeric;
  target_balance numeric;
  remaining_distance numeric;
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

  -- Calculate today's start timestamp
  today_start := date_trunc('day', now());

  -- Calculate realized PnL from trades today
  SELECT COALESCE(SUM(pnl), 0) INTO realized_today_val
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

  -- Calculate target balance (starting + target profit)
  target_balance := challenge_record.starting_balance + challenge_record.target_profit;

  -- Calculate net P&L (current - starting)
  calculated_net_profit := calculated_current_balance - challenge_record.starting_balance;

  -- Calculate remaining distance (target - current), clamped at 0
  remaining_distance := GREATEST(0, target_balance - calculated_current_balance);
  distance_to_pass_val := remaining_distance;

  -- Calculate progress percentage
  IF challenge_record.target_profit > 0 THEN
    progress_pct_val := calculated_net_profit / challenge_record.target_profit;
  ELSE
    progress_pct_val := 0;
  END IF;
  
  -- Determine state
  IF calculated_current_balance >= target_balance THEN
    state_val := 'PASSED';
  ELSE
    state_val := 'ACTIVE';
  END IF;

  -- Calculate distance in R for different risk amounts (using remaining distance)
  distance_in_r_json := jsonb_build_array(
    jsonb_build_object('risk', 250, 'rLeft', ROUND((remaining_distance / 250)::numeric, 2)),
    jsonb_build_object('risk', 500, 'rLeft', ROUND((remaining_distance / 500)::numeric, 2)),
    jsonb_build_object('risk', 1000, 'rLeft', ROUND((remaining_distance / 1000)::numeric, 2))
  );

  -- Return the calculated values - Convert phase to text
  RETURN QUERY SELECT
    challenge_record.id,
    challenge_record.prop_firm,
    CASE 
      WHEN challenge_record.phase = 1 THEN '1'
      WHEN challenge_record.phase = 2 THEN '2'
      WHEN challenge_record.phase = 3 THEN 'Funded'
      ELSE challenge_record.phase::text
    END,
    challenge_record.starting_balance,
    challenge_record.target_profit,
    calculated_current_balance,
    calculated_net_profit,
    realized_today_val,
    distance_to_pass_val,
    distance_in_r_json,
    progress_pct_val,
    state_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
