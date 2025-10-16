-- FIND YOUR USER ID AND FIX R MULTIPLE
-- Step 1: Find your actual User ID
SELECT 
  'FIND YOUR USER ID' as step,
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Once you have your User ID, replace 'YOUR_USER_ID_HERE' with your actual ID
-- Example: If your User ID is '12345678-1234-1234-1234-123456789012'
-- Then replace 'YOUR_USER_ID_HERE' with that ID

-- Step 3: Check your trades with actual User ID
SELECT 
  'YOUR TRADES' as step,
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
WHERE user_id = 'YOUR_USER_ID_HERE'  -- REPLACE THIS WITH YOUR ACTUAL USER ID
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Fix R Multiple for your trades
UPDATE public.trades 
SET r_multiple = CASE 
  WHEN risk_amount > 0 AND pnl IS NOT NULL THEN ROUND((pnl / risk_amount)::numeric, 3)
  ELSE 0
END
WHERE user_id = 'YOUR_USER_ID_HERE'  -- REPLACE THIS WITH YOUR ACTUAL USER ID
  AND status != 'open';

-- Step 5: Verify the fix
SELECT 
  'AFTER FIX - VERIFICATION' as step,
  id,
  asset,
  pnl,
  risk_amount,
  r_multiple,
  CASE 
    WHEN pnl > 0 AND r_multiple > 0 THEN '✅ WINNING TRADE - CORRECT'
    WHEN pnl < 0 AND r_multiple < 0 THEN '✅ LOSING TRADE - CORRECT'
    WHEN pnl > 0 AND r_multiple < 0 THEN '❌ WINNING TRADE - WRONG R'
    WHEN pnl < 0 AND r_multiple > 0 THEN '❌ LOSING TRADE - WRONG R'
    ELSE '⏳ NO P&L DATA'
  END as verification
FROM public.trades 
WHERE user_id = 'YOUR_USER_ID_HERE'  -- REPLACE THIS WITH YOUR ACTUAL USER ID
  AND pnl IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
