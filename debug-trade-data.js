#!/usr/bin/env node

// Debug script to check trade data and Net P&L calculation
console.log('🔍 Debugging Trade Data and Net P&L Calculation');
console.log('===============================================');
console.log('');
console.log('📊 Your current stats show:');
console.log('- Current Balance: $102,593');
console.log('- Net P&L: $0 (This should be +$2,593)');
console.log('- Distance to Pass: $8,000');
console.log('- Today\'s P&L: $0');
console.log('');
console.log('🔧 The issue: Net P&L calculation is not finding trades or trade data');
console.log('');
console.log('📋 Let\'s check your trade data with these SQL queries:');
console.log('');
console.log('🔗 DIAGNOSTIC SQL QUERIES:');
console.log('=====================================');

const diagnosticQueries = `
-- Query 1: Check if you have any trades at all
SELECT 
  'Total Trades' as metric,
  COUNT(*) as value
FROM public.trades
WHERE user_id = auth.uid();

-- Query 2: Check closed trades only
SELECT 
  'Closed Trades' as metric,
  COUNT(*) as value
FROM public.trades
WHERE user_id = auth.uid() AND status = 'closed';

-- Query 3: Check total P&L from all closed trades
SELECT 
  'Total P&L from Trades' as metric,
  COALESCE(SUM(pnl), 0) as value
FROM public.trades
WHERE user_id = auth.uid() AND status = 'closed';

-- Query 4: Check trades by date (using entry_time)
SELECT 
  'Trades by Entry Date' as metric,
  DATE(entry_time) as trade_date,
  COUNT(*) as trade_count,
  COALESCE(SUM(pnl), 0) as daily_pnl
FROM public.trades
WHERE user_id = auth.uid() AND status = 'closed'
GROUP BY DATE(entry_time)
ORDER BY trade_date DESC
LIMIT 10;

-- Query 5: Check trades by exit_time (old method)
SELECT 
  'Trades by Exit Date (OLD METHOD)' as metric,
  DATE(exit_time) as trade_date,
  COUNT(*) as trade_count,
  COALESCE(SUM(pnl), 0) as daily_pnl
FROM public.trades
WHERE user_id = auth.uid() AND status = 'closed'
GROUP BY DATE(exit_time)
ORDER BY trade_date DESC
LIMIT 10;

-- Query 6: Check challenge start date vs trade dates
SELECT 
  'Challenge vs Trades' as metric,
  cp.started_at as challenge_start,
  MIN(t.entry_time) as first_trade_entry,
  MAX(t.entry_time) as last_trade_entry,
  MIN(t.exit_time) as first_trade_exit,
  MAX(t.exit_time) as last_trade_exit
FROM public.challenge_phases cp
LEFT JOIN public.trades t ON t.user_id = cp.user_id AND t.status = 'closed'
WHERE cp.user_id = auth.uid() AND cp.status = 'active'
GROUP BY cp.started_at;

-- Query 7: Check today's trades specifically
SELECT 
  'Today\'s Trades (Entry Time)' as metric,
  COUNT(*) as trade_count,
  COALESCE(SUM(pnl), 0) as today_pnl
FROM public.trades
WHERE user_id = auth.uid() 
  AND status = 'closed'
  AND entry_time >= date_trunc('day', now())
  AND entry_time < date_trunc('day', now()) + interval '1 day';

-- Query 8: Check if started_at is null in challenge_phases
SELECT 
  'Challenge Started At' as metric,
  started_at,
  created_at,
  updated_at
FROM public.challenge_phases
WHERE user_id = auth.uid() AND status = 'active';

-- Query 9: Sample of your actual trade data
SELECT 
  'Sample Trade Data' as metric,
  id,
  entry_time,
  exit_time,
  pnl,
  r_multiple,
  status,
  created_at
FROM public.trades
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;
`;

console.log(diagnosticQueries);
console.log('=====================================');
console.log('');
console.log('📋 Steps to diagnose the issue:');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Create a new query');
console.log('4. Copy and paste the diagnostic queries above');
console.log('5. Click "Run" to execute the SQL');
console.log('6. Review the results to identify the issue');
console.log('');
console.log('🔍 What to look for:');
console.log('- Query 1: Do you have any trades at all?');
console.log('- Query 2: Do you have any closed trades?');
console.log('- Query 3: What is the total P&L from all closed trades?');
console.log('- Query 4: Are your trades being counted by entry_time?');
console.log('- Query 5: Are your trades being counted by exit_time?');
console.log('- Query 6: Is the challenge start date before your trades?');
console.log('- Query 7: Are today\'s trades being counted?');
console.log('- Query 8: Is the challenge started_at field null?');
console.log('- Query 9: What does your actual trade data look like?');
console.log('');
console.log('🎯 Expected Results:');
console.log('- You should have closed trades with P&L values');
console.log('- Total P&L should be around +$2,593');
console.log('- Challenge start date should be before your trade dates');
console.log('- Today\'s trades should be counted if you traded today');
console.log('');
console.log('⚠️  Common Issues:');
console.log('1. No trades in database (Query 1,2 return 0)');
console.log('2. Challenge started_at is null (Query 8 shows null)');
console.log('3. Trades have null or zero P&L values (Query 9 shows 0)');
console.log('4. Date filtering issues (Queries 4,5 show different results)');
console.log('5. Trades are open instead of closed (Query 2 returns 0)');
console.log('');
console.log('✅ Run these queries and let me know the results!');
