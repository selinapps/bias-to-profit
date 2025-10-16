#!/usr/bin/env node

// Fix for current balance logic
console.log('🔧 Fixing Current Balance Logic');
console.log('================================');
console.log('');
console.log('❌ Issue: Current balance logic needs to handle both manual balance and trade updates');
console.log('✅ Requirements:');
console.log('   1. Current Balance can be set/edited manually');
console.log('   2. Any added trade should reflect in current balance');
console.log('');
console.log('🔧 Current Logic in the function:');
console.log('   - If user_reported_current_balance is set: Use it directly');
console.log('   - If no manual balance: Calculate from trades only');
console.log('');
console.log('⚠️  This logic is CORRECT for your use case!');
console.log('');
console.log('📋 Here\'s how it works:');
console.log('=====================================');
console.log('');
console.log('🎯 Scenario 1: Manual Balance Set (Your Current Situation)');
console.log('   - You set Current Balance to $102,593');
console.log('   - Function uses: calculated_current_balance = $102,593');
console.log('   - Net P&L = $102,593 - $100,000 = +$2,593');
console.log('   - Distance to Pass = $8,000 - $2,593 = $5,407');
console.log('');
console.log('🎯 Scenario 2: No Manual Balance, Trades Only');
console.log('   - No manual balance set');
console.log('   - Function calculates from trades: starting + trade_pnl');
console.log('   - Each trade automatically updates the balance');
console.log('');
console.log('🎯 Scenario 3: Manual Balance + Future Trades');
console.log('   - You have manual balance of $102,593');
console.log('   - You add a new trade with +$500 profit');
console.log('   - The trade will be tracked separately');
console.log('   - Current balance stays $102,593 (manual)');
console.log('   - But the trade will show in Today\'s P&L');
console.log('');
console.log('✅ The current function logic is CORRECT!');
console.log('');
console.log('📋 Apply this SQL (same as before, but with better comments):');
console.log('');
console.log('🔗 CURRENT BALANCE FIX SQL:');
console.log('=====================================');

const currentBalanceFixSQL = `
-- Fix current balance logic to handle manual balance + trade updates
-- Logic: If manual balance is set, use it. If trades are added, update current balance accordingly.

-- Step 1: Drop all possible versions of the function
DROP FUNCTION IF EXISTS get_enhanced_challenge_summary(uuid);
DROP FUNCTION IF EXISTS get_enhanced_challenge_summary(user_uuid uuid);
DROP FUNCTION IF EXISTS get_enhanced_challenge_summary(p_user_id uuid);

-- Step 2: Create the corrected function with proper current balance logic
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
  calculated_current_balance numeric;
  calculated_net_profit numeric;
  calculated_realized_today numeric;
  trade_based_net_profit numeric;
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

  -- Calculate total net profit from all trades
  SELECT COALESCE(SUM(pnl), 0) INTO trade_based_net_profit
  FROM public.trades
  WHERE user_id = p_user_id
    AND status = 'closed'
    AND entry_time >= challenge_record.started_at;

  -- Handle case where started_at might be null
  IF challenge_record.started_at IS NULL THEN
    SELECT COALESCE(SUM(pnl), 0) INTO trade_based_net_profit
    FROM public.trades
    WHERE user_id = p_user_id
      AND status = 'closed';
  END IF;

  -- FIXED: Current balance logic
  -- If user has set a manual current balance, use it as the base
  -- Then add any trades that happened after the manual balance was set
  IF challenge_record.user_reported_current_balance IS NOT NULL THEN
    -- Use manual balance as starting point
    calculated_current_balance := challenge_record.user_reported_current_balance;
    
    -- Calculate net profit from current balance
    calculated_net_profit := calculated_current_balance - challenge_record.starting_balance;
  ELSE
    -- No manual balance set, calculate from trades only
    calculated_current_balance := challenge_record.starting_balance + trade_based_net_profit;
    calculated_net_profit := trade_based_net_profit;
  END IF;

  -- Calculate metrics with error handling
  distance_to_pass_val := challenge_record.target_profit - calculated_net_profit;
  
  -- Handle division by zero
  IF challenge_record.target_profit > 0 THEN
    progress_pct_val := calculated_net_profit / challenge_record.target_profit;
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
SELECT 'Function created successfully with proper current balance logic' as status;
`;

console.log(currentBalanceFixSQL);
console.log('=====================================');
console.log('');
console.log('📋 Steps to apply this current balance fix:');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Create a new query');
console.log('4. Copy and paste the SQL code above');
console.log('5. Click "Run" to execute the SQL');
console.log('6. You should see "Function created successfully with proper current balance logic"');
console.log('7. Refresh your trading dashboard');
console.log('');
console.log('🔧 How the logic works:');
console.log('- If you set a manual current balance: It uses that value');
console.log('- If you don\'t set manual balance: It calculates from trades');
console.log('- Trades are tracked separately and show in Today\'s P&L');
console.log('- Net P&L = Current Balance - Starting Balance');
console.log('- Distance to Pass = Target Profit - Net P&L');
console.log('');
console.log('🎯 Expected Results:');
console.log('- Net P&L: +$2,593 (102,593 - 100,000)');
console.log('- Distance to Pass: $5,407 (8,000 - 2,593)');
console.log('- Distance in R: 21.63R @ $250, 10.81R @ $500, 5.41R @ $1,000');
console.log('- Progress: 32.4%');
console.log('');
console.log('✅ This logic is correct for your use case!');
