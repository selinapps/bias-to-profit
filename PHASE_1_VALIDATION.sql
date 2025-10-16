-- ============================================================
-- PHASE 1 VALIDATION SCRIPT
-- ============================================================
-- Run these queries in Supabase SQL Editor and send results
-- ============================================================

-- ============================================================
-- 1) ENTRY FIELDS VALIDATION - Recent Open Trades
-- ============================================================
SELECT 
  id,
  created_at,
  -- NEW SCHEMA: Entry fields
  setup_name,
  session,
  target_price,
  confidence,
  discipline_tag,
  checklist_passed,
  -- Backward compat check
  locations,
  trading_session,
  model
FROM trades 
ORDER BY created_at DESC 
LIMIT 3;

-- EXPECTED RESULTS:
-- - setup_name: Populated with setup name (NOT NULL)
-- - session: Auto-detected session name OR NULL (if between sessions)
-- - target_price: Your planned target (separate from exit_price)
-- - confidence: 1-5 integer OR NULL (if not set)
-- - discipline_tag: Text value OR NULL (if not set)
-- - locations[0]: Should match setup_name (backward compat)

-- ============================================================
-- 2) CLOSE FIELDS VALIDATION - MAE/MFE/Efficiency
-- ============================================================
SELECT 
  id,
  updated_at,
  status,
  -- Close inputs
  exit_price,
  mae_r,
  mfe_r,
  -- Auto-calculated
  pnl,
  r_multiple,
  duration_minutes,
  efficiency,
  -- Expected efficiency (manual calculation for verification)
  CASE 
    WHEN mfe_r IS NULL OR mfe_r <= 0 THEN NULL 
    ELSE LEAST(1.0, ABS(r_multiple / mfe_r))
  END AS expected_efficiency,
  -- Match check
  CASE 
    WHEN efficiency IS NULL AND (mfe_r IS NULL OR mfe_r <= 0) THEN 'Correct (NULL) ✓'
    WHEN efficiency IS NULL THEN 'Missing efficiency ✗'
    WHEN ABS(efficiency - LEAST(1.0, ABS(r_multiple / NULLIF(mfe_r, 0)))) < 0.01 THEN 'Match ✓'
    ELSE 'Mismatch ✗'
  END AS efficiency_check
FROM trades 
WHERE status = 'closed'
ORDER BY updated_at DESC 
LIMIT 3;

-- EXPECTED RESULTS:
-- - efficiency: Should match expected_efficiency
-- - efficiency: Should be NULL if mfe_r is NULL or <= 0
-- - efficiency_check: Should show "Match ✓" or "Correct (NULL) ✓"

-- ============================================================
-- 3) TRADE MANAGEMENT VALIDATION
-- ============================================================
SELECT 
  id,
  exit_price,
  moved_to_be,
  be_trigger_r,
  partial_at_2r,
  used_trailing_stop,
  orderflow_exit,
  exit_reason
FROM trades 
WHERE status = 'closed'
ORDER BY updated_at DESC 
LIMIT 3;

-- EXPECTED RESULTS:
-- - All fields should have values you entered OR defaults (false for booleans)
-- - exit_reason: Should be your selected reason OR NULL

-- ============================================================
-- 4) NULL SAFETY CHECK - Fields Should Allow NULL
-- ============================================================
SELECT 
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trades'
  AND column_name IN (
    'confidence', 'discipline_tag', 'mae_r', 'mfe_r', 
    'efficiency', 'target_price', 'session'
  )
ORDER BY column_name;

-- EXPECTED RESULTS:
-- - All 7 fields should show is_nullable = 'YES'

-- ============================================================
-- 5) DIVISION-BY-ZERO SAFETY
-- ============================================================
-- Test efficiency calculation safety
SELECT 
  id,
  r_multiple,
  mfe_r,
  efficiency,
  -- This should NEVER error
  CASE 
    WHEN mfe_r IS NULL OR mfe_r = 0 THEN NULL
    ELSE LEAST(1.0, ABS(r_multiple / mfe_r))
  END as safe_calculation
FROM trades
WHERE status = 'closed'
LIMIT 5;

-- EXPECTED RESULTS:
-- - No errors should occur
-- - If mfe_r is NULL or 0, efficiency should be NULL
-- - Otherwise, efficiency should match safe_calculation

-- ============================================================
-- 6) BACKWARD COMPATIBILITY CHECK
-- ============================================================
-- Verify old trades still load without new fields
SELECT 
  id,
  created_at,
  setup_name,
  locations,
  session,
  trading_session,
  -- Check if old trades (NULL in new fields) still work
  CASE 
    WHEN setup_name IS NULL AND locations IS NOT NULL THEN 'Old trade - has locations ✓'
    WHEN setup_name IS NOT NULL THEN 'New trade - has setup_name ✓'
    ELSE 'Missing both ✗'
  END as migration_status
FROM trades
ORDER BY created_at ASC
LIMIT 5;

-- ============================================================
-- 7) COMPLETE SAMPLE ROW FOR PHASE 2
-- ============================================================
-- Get one complete closed trade with ALL fields
SELECT 
  json_build_object(
    -- Core IDs
    'id', id,
    'user_id', user_id,
    'created_at', created_at,
    'updated_at', updated_at,
    
    -- Entry: Basic
    'asset', asset,
    'direction', direction,
    'entry_price', entry_price,
    'stop_loss', stop_loss,
    'entry_time', entry_time,
    'lot_size', lot_size,
    'risk_tier', risk_tier,
    'risk_amount', risk_amount,
    
    -- Entry: NEW SCHEMA
    'setup_name', setup_name,
    'session', session,
    'target_price', target_price,
    'confidence', confidence,
    'discipline_tag', discipline_tag,
    'checklist_passed', checklist_passed,
    
    -- Close: Basic
    'exit_price', exit_price,
    'exit_time', exit_time,
    'status', status,
    
    -- Close: Auto-calculated
    'pnl', pnl,
    'r_multiple', r_multiple,
    'duration_minutes', duration_minutes,
    
    -- Close: NEW SCHEMA Analytics
    'mae_r', mae_r,
    'mfe_r', mfe_r,
    'efficiency', efficiency,
    
    -- Close: Trade Management
    'moved_to_be', moved_to_be,
    'be_trigger_r', be_trigger_r,
    'partial_at_2r', partial_at_2r,
    'used_trailing_stop', used_trailing_stop,
    'orderflow_exit', orderflow_exit,
    'exit_reason', exit_reason,
    
    -- Reflection
    'trade_lessons', trade_lessons,
    'mistake_tags', mistake_tags,
    'good_actions', good_actions,
    
    -- Emotions
    'emotions', emotions
  ) as complete_trade_json
FROM trades 
WHERE status = 'closed'
ORDER BY updated_at DESC 
LIMIT 1;

-- Copy/paste the entire JSON output to me

-- ============================================================
-- 8) ANALYTICS PREVIEW - Confidence Correlation
-- ============================================================
SELECT 
  confidence,
  COUNT(*) as trades,
  ROUND(AVG(r_multiple)::numeric, 3) as avg_r,
  ROUND(AVG(efficiency)::numeric, 3) as avg_efficiency,
  ROUND(COUNT(*) FILTER (WHERE r_multiple > 0)::numeric / COUNT(*) * 100, 1) as win_rate
FROM trades 
WHERE confidence IS NOT NULL 
  AND status = 'closed'
GROUP BY confidence
ORDER BY confidence;

-- EXPECTED: Shows if higher confidence = better results

-- ============================================================
-- 9) ANALYTICS PREVIEW - Discipline Impact
-- ============================================================
SELECT 
  discipline_tag,
  COUNT(*) as trades,
  ROUND(AVG(r_multiple)::numeric, 3) as avg_r,
  ROUND(AVG(efficiency)::numeric, 3) as avg_efficiency,
  ROUND(COUNT(*) FILTER (WHERE r_multiple > 0)::numeric / COUNT(*) * 100, 1) as win_rate
FROM trades 
WHERE discipline_tag IS NOT NULL 
  AND status = 'closed'
GROUP BY discipline_tag
ORDER BY avg_r DESC;

-- EXPECTED: Shows FOMO vs disciplined trade performance

-- ============================================================
-- 10) EFFICIENCY CALCULATION VERIFICATION
-- ============================================================
-- Detailed efficiency check with all components
SELECT 
  id,
  -- Input values
  pnl,
  risk_amount,
  mfe_r,
  -- Calculated r_multiple
  r_multiple,
  -- Manual calculation step-by-step
  CASE WHEN risk_amount > 0 THEN pnl / risk_amount ELSE NULL END as calculated_r_multiple,
  -- Efficiency from DB
  efficiency,
  -- Manual efficiency calculation
  CASE 
    WHEN mfe_r IS NULL OR mfe_r <= 0 THEN NULL
    WHEN r_multiple IS NOT NULL AND mfe_r > 0 THEN 
      LEAST(1.0, ABS(r_multiple / mfe_r))
    ELSE NULL
  END as calculated_efficiency,
  -- Verification
  CASE
    WHEN efficiency IS NULL AND (mfe_r IS NULL OR mfe_r <= 0) THEN '✓ Correct NULL'
    WHEN ABS(efficiency - LEAST(1.0, ABS(r_multiple / NULLIF(mfe_r, 0)))) < 0.01 THEN '✓ Match'
    WHEN efficiency IS NULL AND mfe_r > 0 THEN '✗ Should have value'
    ELSE '✗ Mismatch'
  END as verification
FROM trades 
WHERE status = 'closed'
ORDER BY updated_at DESC
LIMIT 3;

-- ============================================================
-- VALIDATION COMPLETE
-- ============================================================
-- Please send me:
-- 1. Results from Query #1 (entry fields)
-- 2. Results from Query #2 (efficiency check)
-- 3. Complete JSON from Query #7 (one full trade)
-- 4. Any errors or mismatches from Query #10
-- ============================================================

