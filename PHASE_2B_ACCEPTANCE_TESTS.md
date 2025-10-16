# ✅ Phase 2B Acceptance Tests

**Purpose:** Verify all Phase 2B analytics components work correctly  
**Date:** 2024-10-16  
**Status:** Ready for Testing

---

## 🗄️ DATABASE TESTS

### Test 1: Views Exist and Return Data

```sql
-- Test v_trades_analytics
SELECT id, setup_name, r_multiple, mfe_r, efficiency, efficiency_safe, risk_efficiency, capture_percentage
FROM v_trades_analytics
WHERE user_id = auth.uid()
LIMIT 1;
```

**Expected:**
- ✅ Returns rows without error
- ✅ `efficiency_safe` is NULL if `mfe_r` is NULL or <= 0
- ✅ `efficiency_safe` = LEAST(1.0, ABS(r_multiple / mfe_r)) when mfe_r > 0
- ✅ `risk_efficiency` = ABS(r_multiple / mae_r) when mae_r != 0
- ✅ `capture_percentage` = (r_multiple / mfe_r) * 100 when mfe_r > 0

---

```sql
-- Test v_trade_observations
SELECT trade_id, setup_name, observation_type, price_action, r_moved, observation_insight
FROM v_trade_observations
WHERE user_id = auth.uid()
LIMIT 1;
```

**Expected:**
- ✅ Returns joined rows (trades + observations)
- ✅ `observation_insight` properly labeled:
  - "Good Stop Placement" (post_stop + reversal)
  - "Stop Was Correct" (post_stop + continuation)
  - "Left R on Table" (post_target + continuation)
  - "Good Exit Timing" (post_target + reversal)
- ✅ All trade fields + all observation fields present

---

### Test 2: Functions Return Correct Data

```sql
-- Test get_observation_summary
SELECT * FROM get_observation_summary(auth.uid());
```

**Expected:**
- ✅ Returns 1 row with summary stats
- ✅ Returns empty/zero values (not error) when no observations exist
- ✅ All numeric fields are properly aggregated

---

```sql
-- Test get_continuation_by_setup
SELECT * FROM get_continuation_by_setup(auth.uid());
```

**Expected:**
- ✅ Returns rows grouped by setup_name
- ✅ `continuation_rate` = (continuations / target_hit_trades) * 100
- ✅ `avg_extra_r` only from continuation trades
- ✅ `total_missed_r` = SUM of r_moved for continuations
- ✅ Returns empty array (not error) when no data

---

```sql
-- Test get_reversal_after_stop_by_setup
SELECT * FROM get_reversal_after_stop_by_setup(auth.uid());
```

**Expected:**
- ✅ Returns rows grouped by setup_name
- ✅ `reversal_rate` = (reversals / stopped_trades) * 100
- ✅ `stop_quality_score` = same as reversal_rate
- ✅ `avg_r_saved` only from reversal observations
- ✅ Sorted by stop_quality_score DESC

---

```sql
-- Test get_confidence_performance
SELECT * FROM get_confidence_performance(auth.uid());
```

**Expected:**
- ✅ Returns rows for confidence levels 1-5
- ✅ `win_rate` = (wins / total) * 100
- ✅ `avg_r_multiple`, `avg_efficiency`, `avg_pnl` properly calculated
- ✅ Only includes trades where confidence IS NOT NULL

---

```sql
-- Test get_discipline_performance
SELECT * FROM get_discipline_performance(auth.uid());
```

**Expected:**
- ✅ Returns rows grouped by discipline_tag
- ✅ `avg_missed_r` joins with observations (LEFT JOIN)
- ✅ Properly handles trades without observations
- ✅ Sorted by avg_r_multiple DESC

---

```sql
-- Test get_efficiency_by_setup
SELECT * FROM get_efficiency_by_setup(auth.uid());
```

**Expected:**
- ✅ Returns rows with min 3 trades per setup
- ✅ `avg_efficiency`, `avg_mae_r`, `avg_mfe_r` properly averaged
- ✅ `trades_with_efficiency` = COUNT where efficiency IS NOT NULL
- ✅ Sorted by avg_efficiency DESC

---

### Test 3: NULL Safety / Division by Zero

```sql
-- Test with trade that has NULL mfe_r
SELECT 
  id, 
  r_multiple, 
  mfe_r, 
  efficiency, 
  efficiency_safe
FROM v_trades_analytics
WHERE mfe_r IS NULL OR mfe_r <= 0
LIMIT 3;
```

**Expected:**
- ✅ No errors
- ✅ `efficiency_safe` is NULL when `mfe_r` is NULL or <= 0
- ✅ Does NOT crash or return division errors

---

```sql
-- Test efficiency calculation accuracy
SELECT 
  id,
  r_multiple,
  mfe_r,
  efficiency_safe,
  -- Manual calculation for verification
  CASE 
    WHEN mfe_r IS NULL OR mfe_r <= 0 THEN NULL
    ELSE LEAST(1.0, ABS(r_multiple / mfe_r))
  END as expected_efficiency,
  -- Match check
  CASE
    WHEN efficiency_safe IS NULL AND (mfe_r IS NULL OR mfe_r <= 0) THEN '✓ Correct NULL'
    WHEN ABS(efficiency_safe - LEAST(1.0, ABS(r_multiple / NULLIF(mfe_r, 0)))) < 0.01 THEN '✓ Match'
    ELSE '✗ Mismatch'
  END as verification
FROM v_trades_analytics
WHERE user_id = auth.uid()
  AND status = 'closed'
LIMIT 5;
```

**Expected:**
- ✅ `verification` column shows "✓ Match" or "✓ Correct NULL"
- ✅ NO "✗ Mismatch" results

---

## 💻 HOOKS TESTS

### Test 4: usePostTradeAnalytics Hook

**In Browser Console:**

```javascript
// Test observation summary (returns object or null)
const summary = await postTradeAnalytics.fetchObservationSummary();
console.log('Summary:', summary);
```

**Expected:**
- ✅ Returns object with counts and averages
- ✅ Returns null (not error) when no observations exist
- ✅ All fields present: total_observations, trades_observed, avg_r_moved, etc.

---

```javascript
// Test continuation by setup (returns array)
const continuation = await postTradeAnalytics.fetchContinuationBySetup();
console.log('Continuation by Setup:', continuation);
```

**Expected:**
- ✅ Returns array (empty [] if no data, not error)
- ✅ Each object has: setup_name, continuation_rate, avg_extra_r, total_missed_r
- ✅ continuation_rate is percentage (0-100)
- ✅ Sorted by continuation_rate DESC

---

```javascript
// Test fetchAllAnalytics (aggregated load)
const allData = await postTradeAnalytics.fetchAllAnalytics();
console.log('All Analytics:', allData);
```

**Expected:**
- ✅ Returns object with all analytics data
- ✅ Properties: summary, continuationBySetup, reversalBySetup, etc.
- ✅ No errors even if some data is empty
- ✅ loading state works

---

## 🎨 UI TESTS

### Test 5: New Tabs Render

**In App:**

1. Navigate to Analytics page/tab
2. Click through all 10 tabs

**Expected:**
- ✅ All 10 tabs visible in tab list
- ✅ New tabs color-coded (orange/cyan/purple/blue)
- ✅ Mobile: Shows icons only, 2-row grid
- ✅ Desktop: Shows labels, 1-row grid

---

### Test 6: EFFICIENCY Tab

**Click "Efficiency" tab**

**Expected:**
- ✅ If no MAE/MFE data: Shows "No efficiency data yet..." message
- ✅ If has data: Shows Setup Efficiency Ranking
- ✅ Each setup shows:
  - Efficiency percentage badge (large)
  - Trade count + trades with MAE/MFE
  - 4 metrics: Avg Efficiency, Avg MFE, Avg MAE, Avg R
- ✅ Orange gradient styling
- ✅ No crashes on NULL values

---

### Test 7: OBSERVATIONS Tab

**Click "Observations" tab**

**Expected if NO observations:**
- ✅ Shows "No data yet..." empty state

**Expected if HAS observations:**
- ✅ **Observation Summary card:**
  - 4 KPIs: Total observations, Continuations, Reversals, Avg R Impact
  - Cyan/green/blue/orange color coding
- ✅ **Continuation After Target card:**
  - Shows setups with continuation rate
  - Badge shows %  continuation
  - Shows avg extra R, total missed R, trade counts
  - Green gradient styling
- ✅ **Stop Placement Quality card:**
  - Shows stop quality score (reversal rate)
  - Color-coded badges (green 70%+, yellow 50-70%, red <50%)
  - Shows reversal rate, avg R saved, trade counts
  - Blue gradient styling
- ✅ **Recent Observations table:**
  - Shows latest 10 observations
  - Insight badges color-coded
  - Asset, setup, action, time, R impact displayed
  - Scrollable if more than screen height

---

### Test 8: CONFIDENCE Tab

**Click "Confidence" tab**

**Expected if NO confidence data:**
- ✅ Shows "No confidence data yet..." message

**Expected if HAS confidence data:**
- ✅ Shows cards for each confidence level (1-5)
- ✅ Each card displays:
  - Large confidence number (1-5)
  - Text label (Very Low → Very High)
  - Trade count
  - Win rate badge (color-coded)
  - 4 metrics: Avg R, Avg Efficiency, Avg P&L, Sample Size
- ✅ Purple gradient styling
- ✅ Win rate: Green (60%+), Yellow (50-60%), Red (<50%)

---

### Test 9: DISCIPLINE Tab

**Click "Discipline" tab**

**Expected if NO discipline data:**
- ✅ Shows "No discipline data yet..." message

**Expected if HAS discipline data:**
- ✅ Shows card for each discipline tag
- ✅ Color coding works:
  - Green: followed_plan, disciplined, perfect_setup
  - Red: fomo, revenge, emotional
  - Blue: others
- ✅ Each card shows:
  - Capitalized tag name
  - Trade count
  - Avg R badge (color-coded)
  - 5 metrics: Win Rate, Efficiency, P&L, Missed R, Sample Size
- ✅ Missed R shows "N/A" if no observations
- ✅ No crashes on NULL values

---

### Test 10: Updated SETUPS Tab

**Click "Setups" tab**

**Expected:**
- ✅ Now uses `setup_name` field (not `locations[0]`)
- ✅ Fallback chain: setup_name → locations[0] → notes → 'Unknown'
- ✅ All existing functionality preserved
- ✅ Backward compatible with old trades

---

## 🧪 NULL/EDGE SAFETY TESTS

### Test 11: Trades Without New Fields

**Scenario:** Old trade with NULL in efficiency, mae_r, mfe_r

**Expected:**
- ✅ v_trades_analytics: efficiency_safe = NULL (not error)
- ✅ Efficiency tab: Trade not included in rankings
- ✅ No JavaScript errors in console
- ✅ Charts render properly (skip NULL values)

---

### Test 12: No Observations Exist

**Scenario:** User has trades but no observations yet

**Expected:**
- ✅ Observations tab shows empty states for all cards
- ✅ No "undefined" or "NaN" displayed
- ✅ No console errors
- ✅ Functions return empty arrays []
- ✅ get_observation_summary returns zeros

---

### Test 13: Partial Data

**Scenario:** Some trades have confidence, some don't

**Expected:**
- ✅ Confidence tab only shows trades with confidence IS NOT NULL
- ✅ Other tabs still work with full dataset
- ✅ No filtering conflicts
- ✅ Sample sizes accurate

---

### Test 14: Division Edge Cases

**Scenario:** Trade with mfe_r = 0 or very small values

**Query:**
```sql
SELECT * FROM v_trades_analytics WHERE mfe_r = 0 OR mfe_r BETWEEN -0.01 AND 0.01;
```

**Expected:**
- ✅ efficiency_safe = NULL (not Infinity or NaN)
- ✅ No database errors
- ✅ No JavaScript errors when displayed

---

## 📊 PERFORMANCE TESTS

### Test 15: Query Performance

**Run with timer:**

```sql
EXPLAIN ANALYZE
SELECT * FROM get_continuation_by_setup(auth.uid());
```

**Expected:**
- ✅ Uses indexes (idx_post_obs_trade_id, idx_post_obs_user_id, idx_post_obs_type)
- ✅ Execution time < 100ms for 100 observations
- ✅ No sequential scans on large tables

---

### Test 16: UI Load Time

**Measure in browser:**

1. Open Analytics page
2. Measure time to render new tabs

**Expected:**
- ✅ Initial render < 1 second
- ✅ fetchAllAnalytics() completes < 2 seconds
- ✅ No infinite loading states
- ✅ Error boundaries catch any failures

---

## 🎯 FUNCTIONAL TESTS

### Test 17: Continuation Rate Calculation

**Manual Verification:**

1. Create test trade, close with target hit
2. Add observation: Type = "After Target", Action = "Continuation", R = +2.0
3. Run query:

```sql
SELECT * FROM get_continuation_by_setup(auth.uid()) WHERE setup_name = '[Your Test Setup]';
```

**Expected:**
- ✅ Shows in results with continuation_rate >= 0
- ✅ avg_extra_r includes your +2.0R
- ✅ total_missed_r includes your +2.0R

---

### Test 18: Stop Quality Calculation

**Manual Verification:**

1. Create test trade, close at stop loss
2. Add observation: Type = "After Stop", Action = "Reversal", R = +1.5
3. Run query:

```sql
SELECT * FROM get_reversal_after_stop_by_setup(auth.uid()) WHERE setup_name = '[Your Test Setup]';
```

**Expected:**
- ✅ stop_quality_score reflects reversal
- ✅ avg_r_saved includes your +1.5R
- ✅ reversal_rate calculated correctly

---

### Test 19: Confidence Correlation

**Manual Verification:**

1. Create 2 trades with different confidence levels (e.g., 2 and 5)
2. Close both
3. Check Confidence tab

**Expected:**
- ✅ Shows 2 separate cards (one for each confidence level)
- ✅ Stats calculated independently
- ✅ Sample sizes correct (1 each)

---

### Test 20: Discipline Impact

**Manual Verification:**

1. Create trade with discipline_tag = "followed_plan"
2. Create trade with discipline_tag = "fomo"
3. Close both
4. Check Discipline tab

**Expected:**
- ✅ Shows 2 cards (green for followed_plan, red for fomo)
- ✅ Stats calculated correctly for each
- ✅ Color coding matches tag type

---

## 🔧 INTEGRATION TESTS

### Test 21: Data Flow End-to-End

**Complete Workflow:**

1. Apply migration: `create_views_phase2b.sql`
2. Verify views exist
3. Verify functions exist
4. Open app, navigate to Analytics
5. Check all 10 tabs load
6. Click each new tab (Efficiency, Observations, Confidence, Discipline)
7. Verify data displays or shows empty states

**Expected:**
- ✅ No errors at any step
- ✅ All tabs accessible
- ✅ Data displays correctly or shows "No data yet"
- ✅ No console errors
- ✅ No infinite loading states

---

### Test 22: Backward Compatibility

**Scenario:** Old trades without Phase 1/2 fields

**Expected:**
- ✅ Old trades still show in existing tabs (Hours, Weekly, Daily, Equity)
- ✅ New tabs handle missing fields gracefully
- ✅ Setups tab shows both old and new trades
- ✅ Edge tab works with mixed data

---

## 📋 ACCEPTANCE CHECKLIST

### Database Layer
- [ ] `v_trades_analytics` view created
- [ ] `v_trade_observations` view created/updated
- [ ] 9 RPC functions created
- [ ] All functions return correct types
- [ ] NULL-safe calculations verified
- [ ] No division by zero errors
- [ ] Indexes being used (EXPLAIN ANALYZE)

### Hooks Layer
- [ ] `usePostTradeAnalytics` hook created
- [ ] All 10 fetch functions work
- [ ] Returns empty arrays on no data (not errors)
- [ ] TypeScript types correct
- [ ] Error handling works

### UI Layer
- [ ] 10 tabs visible in TabsList
- [ ] Tab 7 (Efficiency) renders
- [ ] Tab 8 (Observations) renders
- [ ] Tab 9 (Confidence) renders
- [ ] Tab 10 (Discipline) renders
- [ ] Setups tab updated to use setup_name
- [ ] All empty states work
- [ ] No crashes on NULL values
- [ ] Responsive layout works (mobile + desktop)

### Data Accuracy
- [ ] Efficiency calculations match manual calc
- [ ] Continuation rates accurate
- [ ] Stop quality scores accurate
- [ ] Confidence correlation correct
- [ ] Discipline impact correct

### Performance
- [ ] Queries < 100ms
- [ ] UI renders < 2s
- [ ] No performance degradation
- [ ] Paginated/aggregated (not client loops)

---

## ✅ FINAL VERIFICATION QUERIES

**Run all these and verify no errors:**

```sql
-- 1. Views exist
SELECT * FROM v_trades_analytics LIMIT 1;
SELECT * FROM v_trade_observations LIMIT 1;

-- 2. Functions work
SELECT * FROM get_observation_summary(auth.uid());
SELECT * FROM get_continuation_by_setup(auth.uid());
SELECT * FROM get_reversal_after_stop_by_setup(auth.uid());
SELECT * FROM get_optimal_observation_window(auth.uid());
SELECT * FROM get_exit_quality_by_setup(auth.uid());
SELECT * FROM get_missed_r_timeline(auth.uid(), 30);
SELECT * FROM get_confidence_performance(auth.uid());
SELECT * FROM get_discipline_performance(auth.uid());
SELECT * FROM get_efficiency_by_setup(auth.uid());

-- 3. NULL safety
SELECT efficiency_safe FROM v_trades_analytics WHERE mfe_r IS NULL LIMIT 1;
-- Should return NULL, not error

-- 4. Join works
SELECT COUNT(*) FROM v_trade_observations WHERE user_id = auth.uid();
-- Should return count (0 or more), not error
```

---

## 🎯 SUCCESS CRITERIA

Phase 2B is successful if:

1. ✅ Migration runs without errors
2. ✅ All 9 RPC functions callable
3. ✅ Both views return data
4. ✅ usePostTradeAnalytics hook works
5. ✅ All 4 new tabs render
6. ✅ Setups tab uses setup_name
7. ✅ No NULL pointer errors
8. ✅ No division by zero errors
9. ✅ Empty states display correctly
10. ✅ Calculations match expected values

---

## 🚨 KNOWN ISSUES TO CHECK

### Issue: "Function does not exist"
**Cause:** Migration not run  
**Fix:** Run `migrations/create_views_phase2b.sql`

### Issue: "Permission denied"
**Cause:** RLS not configured correctly  
**Fix:** Verify user_id filtering in functions

### Issue: "Division by zero"
**Cause:** Missing NULL check  
**Fix:** Already guarded in SQL, report if occurs

### Issue: "Tabs not showing"
**Cause:** analyticsData not loaded  
**Fix:** Check useEffect runs, check console for errors

---

## 📞 HOW TO REPORT ISSUES

If any test fails, provide:

1. **Which test failed** (Test number + name)
2. **Error message** (SQL error or JS console error)
3. **Expected vs Actual** behavior
4. **Screenshot** (if UI issue)
5. **Sample data** (if calculation issue)

---

**Run through these tests and report results - then we'll move to Phase 2C (visualization enhancements)!** 🚀

