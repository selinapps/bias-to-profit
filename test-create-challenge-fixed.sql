-- TEST: Create a sample challenge (Fixed Version)
-- This will work without authentication issues

-- First, let's see what user IDs exist
SELECT id, email FROM auth.users LIMIT 5;

-- If you see users above, replace 'YOUR_USER_ID_HERE' with an actual user ID
-- For example, if you see a user with ID '12345678-1234-1234-1234-123456789012'
-- Replace 'YOUR_USER_ID_HERE' with that ID

-- Insert a test challenge (REPLACE 'YOUR_USER_ID_HERE' with actual user ID)
INSERT INTO public.challenge_phases (
  user_id,
  prop_firm,
  phase,
  starting_balance,
  target_profit,
  user_reported_current_balance
) VALUES (
  'YOUR_USER_ID_HERE',  -- Replace this with an actual user ID from the query above
  'Funded Hive',
  '1',
  50000,
  8000,
  55500
);

-- Check if it was inserted
SELECT * FROM public.challenge_phases WHERE user_id = 'YOUR_USER_ID_HERE';

-- Test the function
SELECT * FROM get_challenge_summary('YOUR_USER_ID_HERE');
