-- TEST: Create a sample challenge
-- Run this to test if the card appears

-- Insert a test challenge (this will use your current user ID)
INSERT INTO public.challenge_phases (
  user_id,
  prop_firm,
  phase,
  starting_balance,
  target_profit,
  user_reported_current_balance
) VALUES (
  auth.uid(),  -- This uses your current logged-in user ID
  'Funded Hive',
  '1',
  50000,
  8000,
  55500
);

-- Check if it was inserted
SELECT * FROM public.challenge_phases WHERE user_id = auth.uid();

-- Test the function
SELECT * FROM get_challenge_summary(auth.uid());
