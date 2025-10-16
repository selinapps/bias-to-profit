-- FIX R MULTIPLE FOR YOUR TRADES
-- User ID: 6e7d8a45-709f-4b50-8229-d61fb6915310

-- Step 1: Check your current trades
SELECT 
  'YOUR CURRENT TRADES' as step,
  id,
  asset,
  direction,
  entry_price,
  exit_price,
  stop_loss,
  pnl,
  r_multiple,
  risk_amount,
  risk_tier,
  status,
  created_at
FROM public.trades 
WHERE user_id = '6e7d8a45-709f-4b50-8229-d61fb6915310'
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Fix R Multiple calculation for all your trades
UPDATE public.trades 
SET r_multiple = CASE 
  WHEN risk_amount > 0 AND pnl IS NOT NULL THEN ROUND((pnl / risk_amount)::numeric, 3)
  ELSE 0
END
WHERE user_id = '6e7d8a45-709f-4b50-8229-d61fb6915310'
  AND pnl IS NOT NULL;

-- Step 3: Verify the fix - show your corrected trades
SELECT 
  'AFTER FIX - VERIFICATION' as step,
  id,
  asset,
  direction,
  pnl,
  risk_amount,
  r_multiple,
  CASE 
    WHEN pnl > 0 AND r_multiple > 0 THEN '✅ WINNING TRADE - CORRECT'
    WHEN pnl < 0 AND r_multiple < 0 THEN '✅ LOSING TRADE - CORRECT'
    WHEN pnl > 0 AND r_multiple < 0 THEN '❌ WINNING TRADE - WRONG R'
    WHEN pnl < 0 AND r_multiple > 0 THEN '❌ LOSING TRADE - WRONG R'
    WHEN pnl = 0 THEN '⏳ BREAKEVEN'
    ELSE '⏳ NO P&L DATA'
  END as verification,
  status
FROM public.trades 
WHERE user_id = '6e7d8a45-709f-4b50-8229-d61fb6915310'
  AND pnl IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Show summary of your trades
SELECT 
  'FINAL SUMMARY' as step,
  COUNT(*) as total_trades_with_pnl,
  COUNT(CASE WHEN pnl > 0 AND r_multiple > 0 THEN 1 END) as correct_winning_trades,
  COUNT(CASE WHEN pnl < 0 AND r_multiple < 0 THEN 1 END) as correct_losing_trades,
  COUNT(CASE WHEN pnl > 0 AND r_multiple <= 0 THEN 1 END) as incorrect_winning_trades,
  COUNT(CASE WHEN pnl < 0 AND r_multiple >= 0 THEN 1 END) as incorrect_losing_trades,
  AVG(CASE WHEN pnl > 0 THEN r_multiple END) as avg_winning_r_multiple,
  AVG(CASE WHEN pnl < 0 THEN r_multiple END) as avg_losing_r_multiple
FROM public.trades 
WHERE user_id = '6e7d8a45-709f-4b50-8229-d61fb6915310'
  AND pnl IS NOT NULL;

-- Step 5: Show your specific trades that should be fixed
SELECT 
  'YOUR SPECIFIC TRADES' as step,
  asset,
  direction,
  pnl,
  risk_amount,
  r_multiple,
  CASE 
    WHEN pnl = 465 THEN 'Should be +0.93R'
    WHEN pnl = 83 THEN 'Should be +0.17R'
    ELSE 'Other trade'
  END as expected_result
FROM public.trades 
WHERE user_id = '6e7d8a45-709f-4b50-8229-d61fb6915310'
  AND (pnl = 465 OR pnl = 83 OR pnl IS NOT NULL)
ORDER BY created_at DESC;
