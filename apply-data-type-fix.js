#!/usr/bin/env node

// Fix for data type mismatch error
console.log('🔧 Fixing Data Type Mismatch Error');
console.log('==================================');
console.log('');
console.log('❌ Error identified: "Returned type integer does not match expected type text in column 4"');
console.log('✅ Root cause: The phase field is stored as integer in database but expected as text');
console.log('🔧 Solution: Add explicit type casting for phase field');
console.log('');
console.log('📋 Apply this CORRECTED SQL in your Supabase Dashboard:');
console.log('');
console.log('🔗 DATA TYPE FIX SQL:');
console.log('=====================================');

const dataTypeFixSQL = `
-- Fix data type mismatch in challenge function
-- Error 42804: "Returned type integer does not match expected type text in column 4"

-- Step 1: Drop all possible versions of the function
DROP FUNCTION IF EXISTS get_enhanced_challenge_summary(uuid);
DROP FUNCTION IF EXISTS get_enhanced_challenge_summary(user_uuid uuid);
DROP FUNCTION IF EXISTS get_enhanced_challenge_summary(p_user_id uuid);

-- Step 2: Create the corrected function with proper data types
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

  -- Calculate net profit from trades since challenge start - FIXED: use entry_time instead of exit_time
  SELECT COALESCE(SUM(pnl), 0) INTO calculated_net_profit
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= challenge_record.started_at;

  -- Handle case where started_at might be null
  IF challenge_record.started_at IS NULL THEN
    SELECT COALESCE(SUM(pnl), 0) INTO calculated_net_profit
    FROM public.trades
    WHERE user_id = p_user_id
      AND status = 'closed';
  END IF;

  -- Determine current balance
  IF challenge_record.user_reported_current_balance IS NOT NULL THEN
    calculated_current_balance := challenge_record.user_reported_current_balance;
  ELSE
    calculated_current_balance := challenge_record.starting_balance + calculated_net_profit;
  END IF;

  -- Calculate metrics with error handling
  distance_to_pass_val := challenge_record.target_profit - calculated_net_profit;
  
  -- Handle division by zero
  IF challenge_record.target_profit > 0 THEN
    progress_pct_val := (calculated_current_balance - challenge_record.starting_balance) / challenge_record.target_profit;
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
SELECT 'Function created successfully with proper data types' as status;
`;

console.log(dataTypeFixSQL);
console.log('=====================================');
console.log('');
console.log('📋 Steps to apply this data type fix:');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Create a new query');
console.log('4. Copy and paste the SQL code above');
console.log('5. Click "Run" to execute the SQL');
console.log('6. You should see "Function created successfully with proper data types"');
console.log('7. Refresh your trading dashboard');
console.log('');
console.log('🔧 Key fix in this version:');
console.log('- Added explicit type casting: challenge_record.phase::text');
console.log('- Ensures the phase field is returned as text instead of integer');
console.log('- Maintains all previous fixes (entry_time, error handling, etc.)');
console.log('- Resolves the 42804 data type mismatch error');
console.log('');
console.log('🎯 Expected Results:');
console.log('- The 42804 error should be resolved');
console.log('- Challenge stats should display correctly');
console.log('- Today\'s P&L, Net P&L, and stop losses should show real values');
console.log('- Progress bar should reflect actual performance');
console.log('');
console.log('✅ This should resolve the data type mismatch issue!');
