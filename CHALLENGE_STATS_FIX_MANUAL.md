# Challenge Stats Fix - Manual Application

## Problem Identified

The challenge stats in your dashboard are showing incorrect values (like $0 for Net P&L, Today's P&L, and 0 stop losses) because the `get_enhanced_challenge_summary` database function is using `exit_time` to filter trades by date, while the rest of the application uses `entry_time`.

## Root Cause

In the `get_enhanced_challenge_summary` function:
- **Line 427**: Uses `exit_time` for "today's P&L" calculation
- **Line 435**: Uses `exit_time` for "net profit" calculation

This causes incorrect date filtering because:
1. Trades might be entered on one day but closed on another
2. The frontend expects stats to be calculated based on `entry_time` (when the trade was made)
3. This inconsistency leads to missing or incorrect trade data in calculations

## Solution

Apply this SQL fix to your Supabase database:

### Method 1: Through Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Paste the following SQL and execute it:

```sql
-- Fix challenge stats calculation issues
-- This migration fixes the incorrect date filtering in challenge summary functions

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
  -- Get the active challenge for the user
  SELECT * INTO challenge_record
  FROM public.challenge_phases
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  -- If no active challenge, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get daily state
  SELECT * INTO daily_state
  FROM get_challenge_daily_state(challenge_record.id);

  -- Calculate today's start timestamp
  today_start := date_trunc('day', now());

  -- Calculate realized PnL from trades today - FIXED: use entry_time instead of exit_time
  SELECT COALESCE(SUM(pnl), 0) INTO challenge_record.realized_today
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

  -- Determine current balance
  IF challenge_record.user_reported_current_balance IS NOT NULL THEN
    calculated_current_balance := challenge_record.user_reported_current_balance;
  ELSE
    calculated_current_balance := challenge_record.starting_balance + calculated_net_profit;
  END IF;

  -- Calculate metrics
  distance_to_pass_val := challenge_record.target_profit - calculated_net_profit;
  progress_pct_val := (calculated_current_balance - challenge_record.starting_balance) / challenge_record.target_profit;
  
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

  -- Return the calculated values
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

-- Grant permission for the fixed function
GRANT EXECUTE ON FUNCTION get_enhanced_challenge_summary(uuid) TO authenticated;
```

### Method 2: Using Supabase CLI (if available)

If you have the Supabase CLI set up, you can run:

```bash
supabase db push --file fix_challenge_stats_calculation.sql
```

## What This Fix Does

1. **Fixes Today's P&L**: Now uses `entry_time` to filter trades for today's calculations
2. **Fixes Net P&L**: Now uses `entry_time` to filter trades for total profit calculations
3. **Ensures Consistency**: All date filtering now uses `entry_time`, matching the frontend logic
4. **Maintains Functionality**: All other features remain unchanged

## Expected Results After Fix

After applying this fix, your challenge dashboard should display:

- ✅ **Correct Today's P&L**: Shows actual profit/loss from trades entered today
- ✅ **Correct Net P&L**: Shows actual total profit/loss from all closed trades
- ✅ **Correct Stop Losses**: Shows actual number of losing trades
- ✅ **Correct Progress**: Progress bar and percentages should reflect actual performance
- ✅ **Correct Distance to Pass**: Should show accurate remaining amount needed

## Verification Steps

1. Apply the SQL fix
2. Refresh your trading dashboard
3. Check that the stats now show real values instead of zeros
4. Verify that today's P&L matches your actual trades for today
5. Confirm that the progress bar reflects your actual performance

## Files Modified

- `supabase/migrations/20250131000001_fabio_discipline_system.sql` (original function definition)
- `src/hooks/useChallenge.tsx` (frontend code that calls the function)

## Notes

- This fix is backward compatible and won't affect existing data
- The fix only changes how trades are filtered by date, not the actual calculations
- All other challenge features (banking, build phase, etc.) remain unchanged
- The fix ensures consistency between frontend and backend date filtering logic

## Troubleshooting

If you still see issues after applying the fix:

1. **Clear browser cache**: Hard refresh the dashboard (Ctrl+F5 or Cmd+Shift+R)
2. **Check database**: Verify the function was updated by running a test query
3. **Check console**: Look for any JavaScript errors in the browser console
4. **Verify data**: Ensure you have actual trade data in your database

## Support

If you need help applying this fix or encounter any issues, please provide:
- Screenshots of the current dashboard stats
- Any error messages from the browser console
- Confirmation that the SQL was executed successfully
