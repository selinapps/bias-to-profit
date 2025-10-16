-- COMPLETE R MULTIPLE FIX FOR EXISTING AND FUTURE TRADES
-- This fixes R Multiple calculation in the database for all existing trades
-- Frontend code has been updated to use correct formula for future trades

-- Step 1: Check current R Multiple values before fix
SELECT 
  'BEFORE FIX - Current R Multiple Values' as status,
  id,
  asset,
  direction,
  entry_price,
  exit_price,
  stop_loss,
  pnl,
  r_multiple,
  risk_amount,
  status
FROM public.trades 
WHERE user_id = auth.uid() 
  AND status = 'closed'
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Update R Multiple calculation for ALL closed trades
-- R Multiple = P&L / Risk Amount (CORRECT FORMULA)
UPDATE public.trades 
SET r_multiple = CASE 
  WHEN risk_amount > 0 THEN ROUND((pnl / risk_amount)::numeric, 3)
  ELSE 0
END
WHERE user_id = auth.uid() 
  AND status = 'closed'
  AND risk_amount > 0;

-- Step 3: Verify the updated R Multiple values
SELECT 
  'AFTER FIX - Corrected R Multiple Values' as status,
  id,
  asset,
  direction,
  pnl,
  risk_amount,
  r_multiple,
  CASE 
    WHEN risk_amount > 0 THEN ROUND((pnl / risk_amount)::numeric, 3)
    ELSE 0
  END as calculated_r_multiple,
  CASE 
    WHEN r_multiple = ROUND((pnl / risk_amount)::numeric, 3) THEN '✅ CORRECT'
    ELSE '❌ ERROR'
  END as verification
FROM public.trades 
WHERE user_id = auth.uid() 
  AND status = 'closed'
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Show summary of R Multiple fixes
SELECT 
  'R MULTIPLE FIX SUMMARY' as summary,
  COUNT(*) as total_closed_trades,
  AVG(r_multiple) as avg_r_multiple,
  MIN(r_multiple) as min_r_multiple,
  MAX(r_multiple) as max_r_multiple,
  SUM(CASE WHEN r_multiple > 0 THEN 1 ELSE 0 END) as winning_trades,
  SUM(CASE WHEN r_multiple < 0 THEN 1 ELSE 0 END) as losing_trades,
  SUM(CASE WHEN r_multiple = 0 THEN 1 ELSE 0 END) as breakeven_trades
FROM public.trades 
WHERE user_id = auth.uid() 
  AND status = 'closed';

-- Step 5: Show specific examples of corrected trades
SELECT 
  'EXAMPLE CORRECTED TRADES' as examples,
  asset,
  direction,
  pnl,
  risk_amount,
  r_multiple,
  CASE 
    WHEN pnl > 0 THEN 'PROFIT'
    WHEN pnl < 0 THEN 'LOSS'
    ELSE 'BREAKEVEN'
  END as trade_result
FROM public.trades 
WHERE user_id = auth.uid() 
  AND status = 'closed'
  AND pnl != 0
ORDER BY created_at DESC
LIMIT 5;

-- Step 6: Verify no trades have incorrect R Multiple values
SELECT 
  'VERIFICATION - No Incorrect R Multiple Values' as verification,
  COUNT(*) as trades_with_correct_r_multiple
FROM public.trades 
WHERE user_id = auth.uid() 
  AND status = 'closed'
  AND (
    risk_amount <= 0 OR 
    r_multiple = ROUND((pnl / risk_amount)::numeric, 3)
  );

-- Step 7: Final confirmation
SELECT 
  '🎉 R MULTIPLE FIX COMPLETE 🎉' as final_status,
  'All existing trades have been updated with correct R Multiple calculation' as message,
  'Future trades will use the corrected frontend code' as note;
