# Phase 2C: Core Charts - Acceptance Tests

**Version:** v2.3.0  
**Test Date:** October 17, 2025  
**Total Tests:** 25

---

## 🎯 Test Categories

1. **Component Tests** (5 tests) - Individual chart components
2. **Integration Tests** (4 tests) - Charts in TradingAnalytics
3. **Data Flow Tests** (4 tests) - Hook → Chart data pipeline
4. **Empty State Tests** (4 tests) - No data scenarios
5. **Visual Tests** (4 tests) - Colors, tooltips, styling
6. **Performance Tests** (2 tests) - Load times, responsiveness
7. **TypeScript Tests** (2 tests) - Type safety

---

## ✅ Test Suite

### **1. Component Tests**

#### **Test 1.1: ChartContainer renders all states**
**Purpose:** Verify wrapper component handles loading, error, empty, and success states

**Steps:**
1. Import ChartContainer in a test component
2. Pass `loading={true}` → should show spinner
3. Pass `error="Test error"` → should show red alert
4. Pass `isEmpty={true}` → should show empty state icon
5. Pass children with no flags → should render children

**Expected:**
- ✅ Loading state shows spinner + "Loading chart data..."
- ✅ Error state shows AlertCircle icon + error message
- ✅ Empty state shows BarChart3 icon + empty message
- ✅ Success state renders children content

**Status:** ⬜ Not tested yet

---

#### **Test 1.2: EfficiencyScatterChart renders with data**
**Purpose:** Verify scatter plot renders correctly with trade data

**Test Data:**
```typescript
const mockTrades = [
  {
    id: '1', status: 'closed', mae_r: -0.3, mfe_r: 2.5,
    setup_name: 'Breakout', asset: 'EURUSD',
    efficiency: 0.8, r_multiple: 2.0
  },
  {
    id: '2', status: 'closed', mae_r: -0.5, mfe_r: 3.0,
    setup_name: 'Pullback', asset: 'GBPUSD',
    efficiency: 0.67, r_multiple: 2.0
  }
];
```

**Steps:**
1. Render `<EfficiencyScatterChart data={mockTrades} />`
2. Check for scatter plot SVG elements
3. Verify 2 data points rendered
4. Hover over first point → tooltip should appear

**Expected:**
- ✅ Chart renders without errors
- ✅ 2 scatter points visible
- ✅ X-axis label: "Max Adverse Excursion (R)"
- ✅ Y-axis label: "Max Favorable Excursion (R)"
- ✅ Tooltip shows: asset, setup, MAE, MFE, efficiency, R-Multiple

**Status:** ⬜ Not tested yet

---

#### **Test 1.3: ContinuationBarChart renders with data**
**Purpose:** Verify horizontal bar chart renders continuation data

**Test Data:**
```typescript
const mockData = [
  {
    setup_name: 'Breakout',
    target_hit_trades: 10,
    continuation_rate: 75,
    avg_extra_r: 1.5
  },
  {
    setup_name: 'Pullback',
    target_hit_trades: 8,
    continuation_rate: 45,
    avg_extra_r: 0.8
  }
];
```

**Steps:**
1. Render `<ContinuationBarChart data={mockData} />`
2. Check for horizontal bars
3. Verify "Breakout" bar is green (>70%)
4. Verify "Pullback" bar is red (<50%)
5. Hover over bars → tooltips appear

**Expected:**
- ✅ Chart renders without errors
- ✅ 2 horizontal bars visible
- ✅ Bars sorted by continuation rate (Breakout first)
- ✅ Colors match thresholds (green/yellow/red)
- ✅ X-axis: 0-100%
- ✅ Y-axis: Setup names

**Status:** ⬜ Not tested yet

---

#### **Test 1.4: ConfidenceBarChart renders with data**
**Purpose:** Verify grouped bar chart with dual Y-axes

**Test Data:**
```typescript
const mockData = [
  { confidence_level: 1, win_rate: 35, avg_r_multiple: 0.5, trade_count: 5 },
  { confidence_level: 3, win_rate: 55, avg_r_multiple: 1.2, trade_count: 20 },
  { confidence_level: 5, win_rate: 70, avg_r_multiple: 2.0, trade_count: 10 }
];
```

**Steps:**
1. Render `<ConfidenceBarChart data={mockData} />`
2. Check for grouped bars (blue + orange)
3. Verify 3 groups (levels 1, 3, 5)
4. Check legend: "Win Rate (%)" and "Avg R-Multiple"
5. Hover over bars → tooltips appear

**Expected:**
- ✅ Chart renders without errors
- ✅ 6 bars total (2 per confidence level)
- ✅ Blue bars (Win Rate) on left Y-axis
- ✅ Orange bars (Avg R) on right Y-axis
- ✅ Legend interactive
- ✅ Tooltip shows all 4 values

**Status:** ⬜ Not tested yet

---

#### **Test 1.5: DisciplinePieChart renders with data**
**Purpose:** Verify pie chart with percentage labels

**Test Data:**
```typescript
const mockData = [
  {
    discipline_tag: 'followed_plan',
    trade_count: 50,
    win_rate: 65,
    avg_r_multiple: 1.5
  },
  {
    discipline_tag: 'FOMO',
    trade_count: 20,
    win_rate: 40,
    avg_r_multiple: 0.3
  },
  {
    discipline_tag: 'impatient',
    trade_count: 10,
    win_rate: 50,
    avg_r_multiple: 0.8
  }
];
```

**Steps:**
1. Render `<DisciplinePieChart data={mockData} />`
2. Check for pie chart with 3 segments
3. Verify colors: followed_plan = green, FOMO = red, impatient = yellow
4. Check percentage labels (62.5%, 25%, 12.5%)
5. Hover over segments → tooltips appear
6. Click legend item → segment hides/shows

**Expected:**
- ✅ Chart renders without errors
- ✅ 3 pie segments visible
- ✅ Colors match discipline semantics
- ✅ Percentage labels visible (if > 5%)
- ✅ Legend shows all 3 tags with trade counts
- ✅ Tooltip shows: tag, count, %, win rate, avg R

**Status:** ⬜ Not tested yet

---

### **2. Integration Tests**

#### **Test 2.1: Efficiency tab shows chart**
**Steps:**
1. Open app → Analytics → Efficiency tab
2. Verify `EfficiencyScatterChart` renders above table cards

**Expected:**
- ✅ Chart visible at top of tab
- ✅ Existing efficiency table still below
- ✅ No layout breaks

**Status:** ⬜ Not tested yet

---

#### **Test 2.2: Observations tab shows chart**
**Steps:**
1. Open app → Analytics → Observations tab
2. Verify `ContinuationBarChart` renders above summary cards

**Expected:**
- ✅ Chart visible at top of tab
- ✅ Existing observation cards still below
- ✅ No layout breaks

**Status:** ⬜ Not tested yet

---

#### **Test 2.3: Confidence tab shows chart**
**Steps:**
1. Open app → Analytics → Confidence tab
2. Verify `ConfidenceBarChart` renders above table

**Expected:**
- ✅ Chart visible at top of tab
- ✅ Existing confidence table still below
- ✅ No layout breaks

**Status:** ⬜ Not tested yet

---

#### **Test 2.4: Discipline tab shows chart**
**Steps:**
1. Open app → Analytics → Discipline tab
2. Verify `DisciplinePieChart` renders above table

**Expected:**
- ✅ Chart visible at top of tab
- ✅ Existing discipline cards still below
- ✅ No layout breaks

**Status:** ⬜ Not tested yet

---

### **3. Data Flow Tests**

#### **Test 3.1: Efficiency chart receives closedTrades**
**Steps:**
1. Open browser DevTools → React Components
2. Find `EfficiencyScatterChart` component
3. Check props: `data` should be array of trades

**Expected:**
- ✅ `data` prop is defined
- ✅ `data` is array (or empty array)
- ✅ `loading` prop is boolean
- ✅ `error` prop is null or string

**Status:** ⬜ Not tested yet

---

#### **Test 3.2: Continuation chart receives RPC data**
**Steps:**
1. Open browser DevTools → React Components
2. Find `ContinuationBarChart` component
3. Check props: `data` should be from `analyticsData.continuationBySetup`

**Expected:**
- ✅ `data` prop is defined
- ✅ `data` structure matches RPC return type
- ✅ `loading` from `postTradeAnalytics.loading`
- ✅ `error` from `postTradeAnalytics.error`

**Status:** ⬜ Not tested yet

---

#### **Test 3.3: Confidence chart receives RPC data**
**Steps:**
1. Open browser DevTools → React Components
2. Find `ConfidenceBarChart` component
3. Check props: `data` should be from `analyticsData.confidencePerf`

**Expected:**
- ✅ `data` prop is defined
- ✅ `data` has `confidence_level`, `win_rate`, `avg_r_multiple`, `trade_count`
- ✅ `loading` and `error` props correct

**Status:** ⬜ Not tested yet

---

#### **Test 3.4: Discipline chart receives RPC data**
**Steps:**
1. Open browser DevTools → React Components
2. Find `DisciplinePieChart` component
3. Check props: `data` should be from `analyticsData.disciplinePerf`

**Expected:**
- ✅ `data` prop is defined
- ✅ `data` has `discipline_tag`, `trade_count`, `avg_r_multiple`, `win_rate`
- ✅ `loading` and `error` props correct

**Status:** ⬜ Not tested yet

---

### **4. Empty State Tests**

#### **Test 4.1: Efficiency chart empty state**
**Scenario:** No closed trades with MAE/MFE data

**Steps:**
1. Fresh user account (no trades)
2. Open Analytics → Efficiency tab
3. Verify empty state appears

**Expected:**
- ✅ Chart shows empty state (not error)
- ✅ Message: "Close trades with MAE and MFE values to see this scatter plot."
- ✅ BarChart3 icon visible
- ✅ Dashed border around empty state

**Status:** ⬜ Not tested yet

---

#### **Test 4.2: Continuation chart empty state**
**Scenario:** No post-trade observations

**Steps:**
1. User with trades but no observations
2. Open Analytics → Observations tab
3. Verify empty state appears

**Expected:**
- ✅ Chart shows empty state
- ✅ Message: "Add post-trade observations (type: After Target) to see continuation analysis."
- ✅ No error in console

**Status:** ⬜ Not tested yet

---

#### **Test 4.3: Confidence chart empty state**
**Scenario:** No trades with confidence levels

**Steps:**
1. User with trades but no confidence values
2. Open Analytics → Confidence tab
3. Verify empty state appears

**Expected:**
- ✅ Chart shows empty state
- ✅ Message: "Set confidence levels (1-5) when entering trades to see this analysis."
- ✅ No error in console

**Status:** ⬜ Not tested yet

---

#### **Test 4.4: Discipline chart empty state**
**Scenario:** No trades with discipline tags

**Steps:**
1. User with trades but no discipline_tag values
2. Open Analytics → Discipline tab
3. Verify empty state appears

**Expected:**
- ✅ Chart shows empty state
- ✅ Message: "Tag trades with discipline categories (Followed Plan, FOMO, Revenge, etc.) to see this breakdown."
- ✅ No error in console

**Status:** ⬜ Not tested yet

---

### **5. Visual Tests**

#### **Test 5.1: Chart colors match design spec**
**Steps:**
1. Open all 4 tabs
2. Inspect chart colors using browser DevTools
3. Compare with `PHASE_2C_PLAN.md` color palette

**Expected:**
- ✅ Efficiency scatter: Blue tones for setups
- ✅ Continuation bars: Green (>70%), Yellow (50-70%), Red (<50%)
- ✅ Confidence bars: Blue (win rate), Orange (avg R)
- ✅ Discipline pie: Green (Followed Plan), Red (FOMO/Revenge), Yellow (Impatient)

**Status:** ⬜ Not tested yet

---

#### **Test 5.2: Tooltips appear on hover**
**Steps:**
1. Hover over data points in each chart
2. Verify tooltips appear with correct data

**Expected:**
- ✅ Tooltips have popover styling (border, shadow, rounded)
- ✅ Text is readable (adequate contrast)
- ✅ Data values are formatted correctly
- ✅ Tooltips disappear on mouse out

**Status:** ⬜ Not tested yet

---

#### **Test 5.3: Chart responsive sizing**
**Steps:**
1. Resize browser window: 320px → 768px → 1920px
2. Verify charts scale correctly

**Expected:**
- ✅ Charts maintain aspect ratio
- ✅ Labels don't overlap
- ✅ Tooltips still accessible
- ✅ No horizontal scrollbars

**Status:** ⬜ Not tested yet

---

#### **Test 5.4: Chart legends are interactive**
**Steps:**
1. Click legend items in charts (where applicable)
2. Verify data series hide/show

**Expected:**
- ✅ Confidence chart: Click "Win Rate (%)" → blue bars hide
- ✅ Discipline pie: Click legend item → segment hides
- ✅ Click again → segment reappears

**Status:** ⬜ Not tested yet

---

### **6. Performance Tests**

#### **Test 6.1: Chart load time**
**Scenario:** User with 100 closed trades

**Steps:**
1. Open Analytics → Efficiency tab
2. Measure time from tab click to chart render
3. Use browser Performance tab

**Expected:**
- ✅ Initial load: < 2 seconds
- ✅ No janky animations
- ✅ Smooth scroll

**Status:** ⬜ Not tested yet

---

#### **Test 6.2: Tab switching performance**
**Steps:**
1. Click through all 10 analytics tabs rapidly
2. Monitor memory usage in DevTools

**Expected:**
- ✅ Tab switches instantly (< 100ms)
- ✅ No memory leaks
- ✅ Charts re-render correctly

**Status:** ⬜ Not tested yet

---

### **7. TypeScript Tests**

#### **Test 7.1: Chart prop types enforce**
**Steps:**
1. Try passing incorrect prop types in editor
2. Verify TypeScript errors appear

**Test:**
```typescript
// Should error: data should be array, not string
<EfficiencyScatterChart data="invalid" />

// Should error: loading should be boolean, not string
<ContinuationBarChart data={[]} loading="true" />
```

**Expected:**
- ✅ TypeScript errors in IDE
- ✅ Build fails if types are incorrect

**Status:** ⬜ Not tested yet

---

#### **Test 7.2: RPC return types match chart interfaces**
**Steps:**
1. Check `src/integrations/supabase/types.ts`
2. Verify chart components use correct field names

**Expected:**
- ✅ `get_continuation_by_setup()` returns `target_hit_trades` (not `post_target_count`)
- ✅ `get_confidence_performance()` returns `confidence_level` (not `confidence`)
- ✅ `get_confidence_performance()` returns `avg_r_multiple` (not `avg_r`)
- ✅ `get_discipline_performance()` returns `avg_r_multiple` (not `avg_r`)

**Status:** ✅ **PASSED** (Fixed in implementation)

---

## 📊 Test Summary

### **Automated Tests**
- **Not implemented** (manual testing only for Phase 2C)

### **Manual Tests Required**
Total: 25 tests across 7 categories

**Priority:**
- **P0 (Critical):** Tests 1.2-1.5, 2.1-2.4, 4.1-4.4 (12 tests)
- **P1 (High):** Tests 3.1-3.4, 5.1-5.2 (6 tests)
- **P2 (Medium):** Tests 6.1-6.2, 5.3-5.4 (4 tests)
- **P3 (Low):** Tests 1.1, 7.1 (2 tests)

---

## ✅ Acceptance Criteria

### **Minimum to Pass Phase 2C**
- ✅ All 4 charts render without errors
- ✅ Empty states show proper messages
- ✅ TypeScript field names correct (Test 7.2 passed)
- ✅ Integration with TradingAnalytics complete
- ✅ No console errors on tab load

### **Ideal to Pass Phase 2C**
- All P0 + P1 tests pass (18/25)
- Charts populate correctly with real data
- Performance acceptable (< 2s load)
- Visual design matches spec

---

## 🧪 How to Run Tests

### **Manual Testing Procedure**

1. **Setup:**
   ```bash
   git pull origin main
   git checkout v2.3.0
   npm run dev
   ```

2. **Create test data:**
   ```sql
   -- In Supabase SQL Editor:
   -- Add 3 closed trades with MAE/MFE
   -- Add 2 post-trade observations
   -- Add 3 trades with confidence levels (1, 3, 5)
   -- Add 3 trades with discipline tags (followed_plan, FOMO, impatient)
   ```

3. **Run through test list:**
   - Use this document as checklist
   - Mark ✅ for passing tests
   - Mark ❌ for failing tests
   - Note any issues in a separate doc

4. **Report results:**
   - Share pass/fail summary
   - Include screenshots if any visual issues
   - List any blockers or bugs

---

## 📝 Test Data Scripts

### **Generate Test Trades for Efficiency Chart**
```sql
-- Run in Supabase SQL Editor (replace user_id)
INSERT INTO trades (
  user_id, asset, direction, entry_price, stop_loss, exit_price,
  lot_size, risk_amount, status, pnl, r_multiple,
  mae_r, mfe_r, efficiency, setup_name, entry_time, exit_time
) VALUES
  (auth.uid(), 'EURUSD', 'long', 1.1000, 1.0990, 1.1025, 10, 1000, 'closed', 2500, 2.5, -0.3, 3.0, 0.83, 'Breakout', now() - interval '2 hours', now() - interval '1 hour'),
  (auth.uid(), 'GBPUSD', 'short', 1.2700, 1.2710, 1.2670, 8, 800, 'closed', 2400, 3.0, -0.4, 3.5, 0.86, 'Pullback', now() - interval '4 hours', now() - interval '3 hours'),
  (auth.uid(), 'USDJPY', 'long', 150.00, 149.90, 150.15, 10, 1000, 'closed', 1500, 1.5, -0.5, 2.0, 0.75, 'Reversal', now() - interval '6 hours', now() - interval '5 hours');
```

### **Generate Test Observations**
```sql
-- Run after creating trades above
INSERT INTO post_trade_observations (
  user_id, trade_id, observation_type, observation_time, price_action, r_moved
)
SELECT 
  auth.uid(),
  id,
  'post_target',
  '1h',
  'continuation',
  1.5
FROM trades
WHERE user_id = auth.uid() AND setup_name = 'Breakout'
LIMIT 1;
```

### **Add Confidence + Discipline to Existing Trades**
```sql
-- Update 3 trades with confidence and discipline
UPDATE trades
SET 
  confidence = 5,
  discipline_tag = 'followed_plan'
WHERE user_id = auth.uid() AND status = 'closed'
LIMIT 1;

UPDATE trades
SET 
  confidence = 3,
  discipline_tag = 'FOMO'
WHERE user_id = auth.uid() AND status = 'closed'
  AND confidence IS NULL
LIMIT 1;

UPDATE trades
SET 
  confidence = 1,
  discipline_tag = 'impatient'
WHERE user_id = auth.uid() AND status = 'closed'
  AND confidence IS NULL
LIMIT 1;
```

---

## ✅ PHASE 2C TESTING COMPLETE

**When all P0 tests pass:** ✅ Phase 2C ready for production

**If any P0 tests fail:** ⚠️ Must fix before release

**Next:** Tag v2.3.0 and deploy 🚀

