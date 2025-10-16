-- Fix R Multiple calculation in existing trades
-- R Multiple should be calculated as: P&L / Risk Amount (not price difference / stop distance)

-- First, let's check the current R Multiple values in your trades
SELECT 
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
  status
FROM public.trades 
WHERE user_id = auth.uid() 
  AND status = 'closed'
ORDER BY created_at DESC
LIMIT 10;

-- Update R Multiple calculation for all closed trades
-- R Multiple = P&L / Risk Amount
UPDATE public.trades 
SET r_multiple = CASE 
  WHEN risk_amount > 0 THEN ROUND((pnl / risk_amount)::numeric, 3)
  ELSE 0
END
WHERE user_id = auth.uid() 
  AND status = 'closed'
  AND risk_amount > 0;

-- Verify the updated R Multiple values
SELECT 
  id,
  asset,
  direction,
  pnl,
  risk_amount,
  r_multiple,
  CASE 
    WHEN risk_amount > 0 THEN ROUND((pnl / risk_amount)::numeric, 3)
    ELSE 0
  END as calculated_r_multiple
FROM public.trades 
WHERE user_id = auth.uid() 
  AND status = 'closed'
ORDER BY created_at DESC
LIMIT 10;

-- Show summary of R Multiple fixes
SELECT 
  'R Multiple Fix Summary' as summary,
  COUNT(*) as total_closed_trades,
  AVG(r_multiple) as avg_r_multiple,
  MIN(r_multiple) as min_r_multiple,
  MAX(r_multiple) as max_r_multiple,
  SUM(CASE WHEN r_multiple > 0 THEN 1 ELSE 0 END) as winning_trades,
  SUM(CASE WHEN r_multiple < 0 THEN 1 ELSE 0 END) as losing_trades
FROM public.trades 
WHERE user_id = auth.uid() 
  AND status = 'closed';
