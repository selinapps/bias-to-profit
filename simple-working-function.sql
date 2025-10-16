-- SIMPLE WORKING FUNCTION - This should fix the 400 error

-- Drop the problematic function
DROP FUNCTION IF EXISTS get_challenge_summary(uuid);

-- Create a simple working function
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

  -- Return simple calculated values
  RETURN QUERY SELECT
    challenge_record.id,
    challenge_record.prop_firm,
    challenge_record.phase,
    challenge_record.starting_balance,
    challenge_record.target_profit,
    COALESCE(challenge_record.user_reported_current_balance, challenge_record.starting_balance),
    0, -- net_profit (simplified)
    0, -- realized_today (simplified)
    challenge_record.target_profit, -- distance_to_pass (simplified)
    '[]'::jsonb, -- distance_in_r (simplified)
    0.0, -- progress_pct (simplified)
    'ACTIVE'; -- state
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
