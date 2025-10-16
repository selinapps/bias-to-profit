#!/usr/bin/env node

// Fix for R Multiple calculation in trades
console.log('🔧 Fixing R Multiple Calculation in Trades');
console.log('==========================================');
console.log('');
console.log('❌ Problem identified: R Multiple calculation is wrong');
console.log('✅ Your trades show:');
console.log('   Trade 1: P&L $465, Risk $500 → Shows -1.00R (should be +0.93R)');
console.log('   Trade 2: P&L $83, Risk $500 → Shows -1.00R (should be +0.17R)');
console.log('');
console.log('🔧 Current wrong calculation:');
console.log('   R Multiple = Price Difference / Stop Distance');
console.log('');
console.log('✅ Correct calculation should be:');
console.log('   R Multiple = P&L / Risk Amount');
console.log('');
console.log('📋 Apply this SQL to fix existing trades:');
console.log('');
console.log('🔗 R MULTIPLE FIX SQL:');
console.log('=====================================');

const rMultipleFixSQL = `
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
`;

console.log(rMultipleFixSQL);
console.log('=====================================');
console.log('');
console.log('📋 Steps to apply this R Multiple fix:');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Create a new query');
console.log('4. Copy and paste the SQL code above');
console.log('5. Click "Run" to execute the SQL');
console.log('6. Review the results to see the corrected R Multiple values');
console.log('');
console.log('🔧 What this fix does:');
console.log('- Checks current R Multiple values in your trades');
console.log('- Updates all closed trades with correct R Multiple calculation');
console.log('- R Multiple = P&L / Risk Amount');
console.log('- Verifies the updated values are correct');
console.log('- Shows summary statistics');
console.log('');
console.log('🎯 Expected Results After Fix:');
console.log('- Trade 1: P&L $465, Risk $500 → R Multiple +0.93R');
console.log('- Trade 2: P&L $83, Risk $500 → R Multiple +0.17R');
console.log('- All other trades will have corrected R Multiple values');
console.log('- Summary will show proper win/loss statistics');
console.log('');
console.log('⚠️  Note: This fixes existing trades only.');
console.log('   For future trades, the frontend code also needs to be updated');
console.log('   to use the correct R Multiple calculation formula.');
console.log('');
console.log('✅ Run this SQL to fix your existing trade R Multiple values!');
