-- DIAGNOSE TRADES DATABASE ISSUE
-- Check what's actually in your trades table

-- Step 1: Check if you have any trades at all
SELECT 
  'STEP 1 - ALL TRADES' as step,
  COUNT(*) as total_trades,
  COUNT(DISTINCT status) as unique_statuses
FROM public.trades 
WHERE user_id = auth.uid();

-- Step 2: Check all possible status values
SELECT 
  'STEP 2 - STATUS BREAKDOWN' as step,
  status,
  COUNT(*) as count
FROM public.trades 
WHERE user_id = auth.uid()
GROUP BY status
ORDER BY count DESC;

-- Step 3: Show all your trades with their current data
SELECT 
  'STEP 3 - ALL YOUR TRADES' as step,
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
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Check if trades exist with P&L values
SELECT 
  'STEP 4 - TRADES WITH P&L' as step,
  id,
  asset,
  pnl,
  r_multiple,
  risk_amount,
  status
FROM public.trades 
WHERE user_id = auth.uid()
  AND pnl IS NOT NULL
ORDER BY created_at DESC;

-- Step 5: Check trades that match your specific P&L values
SELECT 
  'STEP 5 - YOUR SPECIFIC TRADES' as step,
  id,
  asset,
  pnl,
  r_multiple,
  risk_amount,
  status
FROM public.trades 
WHERE user_id = auth.uid()
  AND (pnl = 465 OR pnl = 83)
ORDER BY created_at DESC;

-- Step 6: Check user authentication
SELECT 
  'STEP 6 - USER CHECK' as step,
  auth.uid() as current_user_id,
  COUNT(*) as trades_for_user
FROM public.trades 
WHERE user_id = auth.uid();
