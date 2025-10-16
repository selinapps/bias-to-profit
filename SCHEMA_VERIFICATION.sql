-- ============================================================
-- SCHEMA VERIFICATION - Test New Fields
-- ============================================================
-- Run this in Supabase SQL Editor to verify migration worked
-- ============================================================

-- 1. Verify all new columns exist
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trades'
  AND column_name IN (
    -- Entry Stage Fields
    'setup_name', 'target_price', 'session',
    'atr_pips', 'spread', 'slippage', 'account_equity',
    'confidence', 'checklist_passed', 'discipline_tag',
    -- Close/Manage Stage Fields
    'mae_r', 'mfe_r', 'efficiency',
    'moved_to_be', 'be_trigger_r', 'partial_at_2r',
    'used_trailing_stop', 'orderflow_exit', 'exit_reason'
  )
ORDER BY column_name;

-- Expected: 19 rows

-- ============================================================
-- 2. Test Insert with New Schema
-- ============================================================
-- Uncomment to test (replace YOUR_USER_ID with actual UUID)
/*
INSERT INTO trades (
  -- Required fields
  user_id, asset, direction, entry_price, stop_loss, risk_tier, risk_amount, model,
  -- NEW SCHEMA: Entry stage
  setup_name, session, target_price, confidence, checklist_passed,
  -- Timing
  entry_time, lot_size
) VALUES (
  'YOUR_USER_ID', 'EURUSD', 'buy', 1.1000, 1.0950, 'a', 500, 'trend',
  -- NEW SCHEMA values
  'OTE Entry', 'London', 1.1050, 4, true,
  -- Timing
  NOW(), 1.0
)
RETURNING id, setup_name, session, target_price, confidence, checklist_passed;
*/

-- ============================================================
-- 3. Test Update (Close Trade) with New Schema
-- ============================================================
-- Uncomment to test (replace TRADE_ID with actual ID from above)
/*
UPDATE trades SET
  status = 'closed',
  exit_price = 1.1045,
  exit_time = NOW(),
  pnl = 435.00,
  r_multiple = 0.870,
  duration_minutes = 75,
  -- NEW SCHEMA: MAE/MFE
  mae_r = -0.35,
  mfe_r = 2.8,
  efficiency = 0.311,  -- 0.870 / 2.8
  -- NEW SCHEMA: Trade Management
  moved_to_be = true,
  be_trigger_r = 1.5,
  partial_at_2r = false,
  used_trailing_stop = true,
  orderflow_exit = false,
  exit_reason = 'Target hit'
WHERE id = 'TRADE_ID'
RETURNING 
  id, pnl, r_multiple, efficiency, 
  mae_r, mfe_r, moved_to_be, exit_reason;
*/

-- ============================================================
-- 4. Verify Calculations
-- ============================================================
-- Test auto-calculated efficiency
SELECT 
  id,
  setup_name,
  r_multiple,
  mfe_r,
  efficiency,
  -- Manual calculation to verify
  CASE 
    WHEN mfe_r IS NOT NULL AND mfe_r > 0 
    THEN LEAST(1.0, r_multiple / mfe_r)
    ELSE NULL
  END as calculated_efficiency,
  -- Check if they match
  CASE 
    WHEN efficiency IS NULL THEN 'No efficiency data'
    WHEN ABS(efficiency - LEAST(1.0, r_multiple / NULLIF(mfe_r, 0))) < 0.001 THEN 'Match ✓'
    ELSE 'Mismatch ✗'
  END as verification
FROM trades
WHERE status = 'closed' 
  AND mfe_r IS NOT NULL
LIMIT 10;

-- ============================================================
-- 5. Analytics Query Test
-- ============================================================
-- Efficiency by Setup
SELECT 
  setup_name,
  COUNT(*) as trades,
  AVG(efficiency) as avg_efficiency,
  AVG(r_multiple) as avg_r,
  AVG(mae_r) as avg_mae,
  AVG(mfe_r) as avg_mfe
FROM trades
WHERE status = 'closed' 
  AND efficiency IS NOT NULL
  AND setup_name IS NOT NULL
GROUP BY setup_name
ORDER BY avg_efficiency DESC;

-- ============================================================
-- 6. Breakeven Analysis Test
-- ============================================================
SELECT 
  moved_to_be,
  COUNT(*) as trades,
  AVG(r_multiple) as avg_r,
  AVG(efficiency) as avg_efficiency,
  COUNT(*) FILTER (WHERE r_multiple > 0) as wins,
  COUNT(*) FILTER (WHERE r_multiple < 0) as losses
FROM trades
WHERE status = 'closed'
GROUP BY moved_to_be;

-- ============================================================
-- 7. Check Null Safety
-- ============================================================
-- Verify no NOT NULL constraints on new fields
SELECT 
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trades'
  AND column_name IN (
    'setup_name', 'mae_r', 'mfe_r', 'efficiency', 
    'moved_to_be', 'exit_reason'
  )
  AND is_nullable = 'NO';  -- Should return 0 rows (all should be YES)

-- ============================================================
-- 8. Check Constraints
-- ============================================================
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.trades'::regclass
  AND conname LIKE '%confidence%' 
  OR conname LIKE '%efficiency%';

-- ============================================================
-- 9. Index Verification
-- ============================================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'trades'
  AND (
    indexname LIKE '%setup_name%' OR
    indexname LIKE '%session%' OR
    indexname LIKE '%efficiency%' OR
    indexname LIKE '%exit_reason%'
  );

-- ============================================================
-- 10. Field Usage Summary
-- ============================================================
SELECT 
  'setup_name' as field,
  COUNT(*) FILTER (WHERE setup_name IS NOT NULL) as populated,
  COUNT(*) FILTER (WHERE setup_name IS NULL) as null_count,
  COUNT(*) as total
FROM trades
UNION ALL
SELECT 
  'session',
  COUNT(*) FILTER (WHERE session IS NOT NULL),
  COUNT(*) FILTER (WHERE session IS NULL),
  COUNT(*)
FROM trades
UNION ALL
SELECT 
  'target_price',
  COUNT(*) FILTER (WHERE target_price IS NOT NULL),
  COUNT(*) FILTER (WHERE target_price IS NULL),
  COUNT(*)
FROM trades
UNION ALL
SELECT 
  'mae_r',
  COUNT(*) FILTER (WHERE mae_r IS NOT NULL),
  COUNT(*) FILTER (WHERE mae_r IS NULL),
  COUNT(*)
FROM trades
UNION ALL
SELECT 
  'mfe_r',
  COUNT(*) FILTER (WHERE mfe_r IS NOT NULL),
  COUNT(*) FILTER (WHERE mfe_r IS NULL),
  COUNT(*)
FROM trades
UNION ALL
SELECT 
  'efficiency',
  COUNT(*) FILTER (WHERE efficiency IS NOT NULL),
  COUNT(*) FILTER (WHERE efficiency IS NULL),
  COUNT(*)
FROM trades
UNION ALL
SELECT 
  'moved_to_be',
  COUNT(*) FILTER (WHERE moved_to_be = true),
  COUNT(*) FILTER (WHERE moved_to_be = false OR moved_to_be IS NULL),
  COUNT(*)
FROM trades;

-- ============================================================
-- VERIFICATION COMPLETE
-- ============================================================
-- Expected Results:
-- 1. All 19 new columns should exist
-- 2. All should be nullable (is_nullable = 'YES')
-- 3. Efficiency should calculate correctly (r_multiple / mfe_r)
-- 4. Indexes should exist for: setup_name, session, exit_reason, efficiency
-- 5. Constraints should exist for: confidence (1-5), efficiency (0-1)
-- ============================================================

