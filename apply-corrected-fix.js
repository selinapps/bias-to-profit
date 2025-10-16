#!/usr/bin/env node

// Corrected fix application script that handles the parameter name conflict
console.log('🔧 Applying Corrected Challenge Stats Fix...');
console.log('============================================');
console.log('');
console.log('❌ The previous fix failed because of a parameter name conflict.');
console.log('✅ Here is the corrected SQL that will work:');
console.log('');
console.log('📋 Execute this SQL in your Supabase Dashboard:');
console.log('');
console.log('🔗 CORRECTED SQL CODE:');
console.log('=====================================');

const correctedSQL = `
-- Step 1: Drop the existing function first
DROP FUNCTION IF EXISTS get_enhanced_challenge_summary(uuid);

-- Step 2: Create the fixed function
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
  SELECT * INTO challenge_record
  FROM public.challenge_phases
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO daily_state
  FROM get_challenge_daily_state(challenge_record.id);

  today_start := date_trunc('day', now());

  -- FIXED: Use entry_time instead of exit_time for today's P&L
  SELECT COALESCE(SUM(pnl), 0) INTO challenge_record.realized_today
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= today_start
    AND entry_time < today_start + interval '1 day';

  -- FIXED: Use entry_time instead of exit_time for net profit
  SELECT COALESCE(SUM(pnl), 0) INTO calculated_net_profit
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= challenge_record.started_at;

  IF challenge_record.user_reported_current_balance IS NOT NULL THEN
    calculated_current_balance := challenge_record.user_reported_current_balance;
  ELSE
    calculated_current_balance := challenge_record.starting_balance + calculated_net_profit;
  END IF;

  distance_to_pass_val := challenge_record.target_profit - calculated_net_profit;
  progress_pct_val := (calculated_current_balance - challenge_record.starting_balance) / challenge_record.target_profit;
  
  IF calculated_current_balance >= challenge_record.starting_balance + challenge_record.target_profit THEN
    state_val := 'PASSED';
  ELSE
    state_val := 'ACTIVE';
  END IF;

  distance_in_r_json := jsonb_build_array(
    jsonb_build_object('risk', 250, 'rLeft', CASE WHEN 250 > 0 THEN distance_to_pass_val / 250 ELSE 0 END),
    jsonb_build_object('risk', 500, 'rLeft', CASE WHEN 500 > 0 THEN distance_to_pass_val / 500 ELSE 0 END),
    jsonb_build_object('risk', 1000, 'rLeft', CASE WHEN 1000 > 0 THEN distance_to_pass_val / 1000 ELSE 0 END)
  );

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

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION get_enhanced_challenge_summary(uuid) TO authenticated;
`;

console.log(correctedSQL);
console.log('=====================================');
console.log('');
console.log('📋 Steps to apply the corrected fix:');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Create a new query');
console.log('4. Copy and paste the SQL code above');
console.log('5. Click "Run" to execute the SQL');
console.log('6. Refresh your trading dashboard');
console.log('');
console.log('🔧 What this corrected fix does:');
console.log('- Drops the old function first to avoid parameter conflicts');
console.log('- Creates the new function with correct parameter name (p_user_id)');
console.log('- Uses entry_time instead of exit_time for date filtering');
console.log('- Maintains all existing functionality');
console.log('');
console.log('✅ Also updated the frontend code to use the correct parameter name');
console.log('');
console.log('🎯 Expected Results:');
console.log('- Today\'s P&L will show actual values instead of $0');
console.log('- Net P&L will show actual profit/loss');
console.log('- Stop losses will show correct count');
console.log('- Progress bar will reflect actual performance');
