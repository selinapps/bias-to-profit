-- TEST: Just test the function without creating a challenge
-- This will show if the function works when no challenge exists

-- Test the function (should return empty result when no challenge exists)
SELECT * FROM get_challenge_summary('00000000-0000-0000-0000-000000000000');

-- Check if the table exists and has the right structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'challenge_phases' 
ORDER BY ordinal_position;

-- Check if the function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_challenge_summary';
