-- QUICK FIX FOR YOUR SPECIFIC TRADES
-- Your trades are still showing -1.00R instead of correct values

-- First, let's see the current state of your trades
SELECT 
  'CURRENT TRADE DATA' as status,
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
  status
FROM public.trades 
WHERE user_id = auth.uid() 
  AND status = 'closed'
ORDER BY created_at DESC
LIMIT 5;

-- Update R Multiple for your specific trades
-- Trade 1: P&L $465, Risk $500 = +0.93R
-- Trade 2: P&L $83, Risk $500 = +0.17R
UPDATE public.trades 
SET r_multiple = CASE 
  WHEN pnl = 465 AND risk_amount = 500 THEN 0.93  -- Your first trade
  WHEN pnl = 83 AND risk_amount = 500 THEN 0.17   -- Your second trade
  WHEN risk_amount > 0 AND pnl IS NOT NULL THEN ROUND((pnl / risk_amount)::numeric, 3)
  ELSE 0
END
WHERE user_id = auth.uid() 
  AND status = 'closed';

-- Verify the fix
SELECT 
  'AFTER FIX - VERIFICATION' as status,
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
    ELSE '⏳ NO P&L DATA'
  END as verification
FROM public.trades 
WHERE user_id = auth.uid() 
  AND status = 'closed'
ORDER BY created_at DESC
LIMIT 5;

-- Show summary
SELECT 
  'FINAL SUMMARY' as status,
  COUNT(*) as total_closed_trades,
  COUNT(CASE WHEN pnl > 0 AND r_multiple > 0 THEN 1 END) as correct_winning_trades,
  COUNT(CASE WHEN pnl < 0 AND r_multiple < 0 THEN 1 END) as correct_losing_trades,
  COUNT(CASE WHEN pnl > 0 AND r_multiple <= 0 THEN 1 END) as incorrect_winning_trades,
  COUNT(CASE WHEN pnl < 0 AND r_multiple >= 0 THEN 1 END) as incorrect_losing_trades
FROM public.trades 
WHERE user_id = auth.uid() 
  AND status = 'closed';
