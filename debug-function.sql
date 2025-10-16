-- DEBUG: Check what's wrong with the get_challenge_summary function

-- First, let's see the current function definition
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'get_challenge_summary' 
  AND routine_schema = 'public';

-- Test with a simple query first
SELECT * FROM public.challenge_phases 
WHERE status = 'active' 
LIMIT 1;

-- Test the function with the actual user ID from your logs
SELECT * FROM get_challenge_summary('6e7d8a45-709f-4b50-8229-d61fb6915310');
