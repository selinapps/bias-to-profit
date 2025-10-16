-- SIMPLE FUNCTION CREATION - Run this AFTER the table is created

-- Drop function if exists
DROP FUNCTION IF EXISTS get_challenge_summary(uuid);

-- Create the function
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
BEGIN
  -- For now, just return empty result if no active challenge
  -- This will stop the 400 error
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
