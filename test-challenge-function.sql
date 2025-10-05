-- TEST CHALLENGE FUNCTION
-- Run this after the migration to test if everything works

-- Test 1: Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'challenge_phases';

-- Test 2: Check if function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_challenge_summary';

-- Test 3: Check if policies exist
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'challenge_phases';

-- Test 4: Try to call the function (this will return empty if no active challenge)
SELECT * FROM get_challenge_summary(auth.uid());

-- Test 5: Insert a test challenge (replace with your actual user_id)
-- INSERT INTO public.challenge_phases (
--   user_id,
--   prop_firm,
--   phase,
--   starting_balance,
--   target_profit
-- ) VALUES (
--   auth.uid(),  -- This will use your current user ID
--   'Funded Hive',
--   '1',
--   50000,
--   8000
-- );

-- Test 6: Check the inserted challenge
-- SELECT * FROM public.challenge_phases WHERE user_id = auth.uid();
