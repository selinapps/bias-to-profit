-- Debug R Multiple calculation issue
-- Check why winning trades still show negative R Multiple

-- Step 1: Check all trade data including risk amounts
SELECT 
  'DEBUG - All Trade Data' as debug_step,
  id,
  asset,
  direction,
  entry_price,
  exit_price,
  stop_loss,
  pnl,
  r_multiple,
  risk_amount,
  lot_size,
  status,
  created_at
FROM public.trades 
WHERE user_id = auth.uid() 
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check if risk_amount field exists and has values
SELECT 
  'DEBUG - Risk Amount Field Check' as debug_step,
  COUNT(*) as total_trades,
  COUNT(risk_amount) as trades_with_risk_amount,
  AVG(risk_amount) as avg_risk_amount,
  MIN(risk_amount) as min_risk_amount,
  MAX(risk_amount) as max_risk_amount
FROM public.trades 
WHERE user_id = auth.uid();

-- Step 3: Check trades without risk_amount
SELECT 
  'DEBUG - Trades Without Risk Amount' as debug_step,
  id,
  asset,
  pnl,
  r_multiple,
  risk_amount,
  lot_size
FROM public.trades 
WHERE user_id = auth.uid() 
  AND (risk_amount IS NULL OR risk_amount = 0)
ORDER BY created_at DESC;

-- Step 4: Calculate what R Multiple should be for each trade
SELECT 
  'DEBUG - Expected vs Actual R Multiple' as debug_step,
  id,
  asset,
  pnl,
  risk_amount,
  r_multiple as current_r_multiple,
  CASE 
    WHEN risk_amount > 0 THEN ROUND((pnl / risk_amount)::numeric, 3)
    WHEN lot_size > 0 THEN ROUND((pnl / (lot_size * 500))::numeric, 3)  -- Assume $500 per lot if no risk_amount
    ELSE 0
  END as expected_r_multiple,
  CASE 
    WHEN risk_amount > 0 AND r_multiple = ROUND((pnl / risk_amount)::numeric, 3) THEN '✅ CORRECT'
    WHEN risk_amount IS NULL OR risk_amount = 0 THEN '⚠️ NO RISK AMOUNT'
    ELSE '❌ INCORRECT'
  END as status
FROM public.trades 
WHERE user_id = auth.uid() 
  AND status = 'closed'
ORDER BY created_at DESC;

-- Step 5: Check table structure to see if risk_amount column exists
SELECT 
  'DEBUG - Table Structure' as debug_step,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'trades' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
