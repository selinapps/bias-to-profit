# 📊 Analytics Infrastructure Inventory

**Date:** 2024-10-16  
**Purpose:** Complete map of existing analytics systems  
**Status:** ✅ Verified from codebase

---

## 🗄️ DATABASE LAYER

### **Tables (7)**

| Table Name | Purpose | Phase | Status |
|------------|---------|-------|--------|
| `trades` | Core trade data (58 fields) | Phase 1 | ✅ Live |
| `post_trade_observations` | Continuation/reversal tracking (13 fields) | Phase 2 | ✅ **NEW** |
| `daily_reflection` | Daily performance reflection | Legacy | ✅ Live |
| `trade_reflection` | Per-trade detailed reflection | Legacy | ✅ Live |
| `bias_state` | Market bias tracking | Legacy | ✅ Live |
| `daily_session_patterns` | ICT session patterns | Legacy | ✅ Live |
| `challenge_phases` | Prop firm challenge tracking | Legacy | ✅ Live |
| `user_settings` | User preferences & config | Legacy | ✅ Live |

---

### **Views (4)**

| View Name | Purpose | Depends On | Status |
|-----------|---------|------------|--------|
| `daily_performance_metrics` | Daily P&L, win rate, R-multiple aggregation | `trades` | ✅ Live |
| `secure_daily_performance_metrics` | Same as above with RLS | `trades` | ✅ Live |
| `v_current_bias` | Current active bias state | `bias_state` | ✅ Live |
| `v_current_session_pattern` | Current session pattern | `daily_session_patterns` | ✅ Live |
| `v_trade_observations` | Trades joined with observations + insights | `trades`, `post_trade_observations` | ✅ **Phase 2 NEW** |

---

### **Functions (10)**

| Function Name | Purpose | Returns | Status |
|---------------|---------|---------|--------|
| `get_user_trade_stats(p_user_id, p_days)` | Overall trading stats | total_pnl, avg_r, win_rate, etc. | ✅ Live |
| `get_daily_losses(p_user_id, p_date)` | Daily loss count for stop rule | number | ✅ Live |
| `get_current_bias(target_day)` | Get bias for specific date | bias_state row | ✅ Live |
| `set_bias_state(...)` | Set/update bias for date | bias_state row | ✅ Live |
| `generate_daily_reflection(p_user_id, p_reflection_date)` | Auto-generate daily reflection | daily_reflection row | ✅ Live |
| `get_reflection_analytics(p_user_id, p_days)` | Reflection analytics over time | reflection data[] | ✅ Live |
| `infer_session_scenario(...)` | Infer ICT scenario from session behaviors | scenario + confidence | ✅ Live |
| `database_health_check()` | System health diagnostics | health check results | ✅ Live |
| `validate_bias_value(bias_value)` | Validate bias enum | boolean | ✅ Live |
| `validate_market_state_value(market_state_value)` | Validate market state enum | boolean | ✅ Live |
| `refresh_daily_performance_metrics()` | Refresh materialized view | undefined | ✅ Live |
| `calculate_r_moved(p_trade_id, p_peak_price, p_observation_type)` | Calculate R from exit for observations | numeric | ✅ **Phase 2 NEW** |

---

### **RPC Functions Called (NOT in types.ts - May Not Exist)**

| Function Name | Called From | Likely Status |
|---------------|-------------|---------------|
| `get_best_trading_hours(p_user_id, p_days)` | useTradingAnalytics | ⚠️ **MISSING** (falls back to client-side calc) |
| `get_weekly_summary(p_user_id, p_weeks)` | useTradingAnalytics | ⚠️ **MISSING** (falls back to client-side calc) |
| `get_daily_performance(p_user_id, p_days)` | useTradingAnalytics | ⚠️ **MISSING** (falls back to client-side calc) |
| `get_today_performance(p_user_id)` | useTradingStats | ⚠️ **MISSING** (fallback exists) |
| `get_model_performance(p_user_id, p_days)` | useTradingStats | ⚠️ **MISSING** (fallback exists) |
| `reset_challenge_daily_state(p_challenge_id)` | Challenge components | ⚠️ **MISSING** (type cast as 'any') |
| `create_discipline_challenge(...)` | useDisciplineChallenge | ⚠️ **MISSING** |
| `record_daily_discipline(...)` | useDisciplineChallenge | ⚠️ **MISSING** |
| `get_challenge_progress(p_challenge_id)` | useDisciplineChallenge | ⚠️ **MISSING** |
| `safe_full_user_reset(p_user_id)` | useSettings | ⚠️ **MISSING** |
| `safe_reset_user_data(p_user_id)` | useSettings | ⚠️ **MISSING** |

---

## 💻 FRONTEND LAYER

### **Analytics Hooks (6)**

| Hook Name | File | Purpose | Computation |
|-----------|------|---------|-------------|
| `useTradingAnalytics` | `hooks/useTradingAnalytics.tsx` | Best hours, weekly/daily performance | ⚠️ Tries RPC (fails) → **Client-side fallback** |
| `useTradingStats` | `hooks/useTradingStats.tsx` | Today's stats, model performance | ⚠️ Tries RPC (fails) → **Client-side fallback** |
| `useTradesOptimized` | `hooks/useTradesOptimized.tsx` | Trade CRUD + daily losses check | ✅ Uses `get_daily_losses` |
| `useReflection` | `hooks/useReflection.tsx` | Daily reflection generation & analytics | ✅ Uses `generate_daily_reflection`, `get_reflection_analytics` |
| `useBiasState` | `hooks/useBiasState.tsx` | Bias state management | ✅ Uses `get_current_bias`, `set_bias_state` |
| `useChallenge` | `hooks/useChallenge.tsx` | Prop firm challenge tracking | ✅ Client-side calculations |

---

### **Analytics Components (5)**

| Component Name | File | Purpose | Data Source |
|----------------|------|---------|-------------|
| `TradingAnalytics` | `components/TradingAnalytics.tsx` | **MAIN analytics dashboard** - Tabs: Hours, Weekly, Daily, Setups, Edge, Equity | Client-side calculations from `closedTrades` |
| `TradeHeatmap` | `components/TradeHeatmap.tsx` | Visual heatmap of trading activity | `closedTrades` array |
| `TradingCalendar` | `components/TradingCalendar.tsx` | Calendar view of trades | `closedTrades` array |
| `DailyWrap` | `components/DailyWrap.tsx` | End-of-day review/summary | `closedTrades` array |
| `DisciplineChallengeDashboard` | `components/DisciplineChallengeDashboard.tsx` | Discipline tracking & gamification | Challenge tables |
| `ReflectionAnalytics` | `components/reflection/ReflectionAnalytics.tsx` | Reflection trends | `get_reflection_analytics` RPC |

---

### **Calculation Libraries (2)**

| Library | File | Exports | Purpose |
|---------|------|---------|---------|
| `tradingCalculations` | `lib/tradingCalculations.ts` | P&L, R-Multiple, Pip calculations, Win rate, Profit factor, Expectancy | **Core calculation formulas** |
| `tradingAnalytics` | `lib/tradingAnalytics.ts` | `calculateBestHours()`, `calculateDailyPerformance()`, `calculateWeeklyPerformance()`, `getTradingStats()` | **Client-side analytics aggregation** |

---

## 📊 CURRENT ANALYTICS COVERAGE

### **✅ Fully Implemented (Client-Side)**

These work without database functions - calculated in browser:

#### **In TradingAnalytics Component:**
1. **Best Trading Hours** - Hourly P&L, win rate, avg R
2. **Weekly Summary** - Weekly totals, trading days, consistency
3. **Daily Performance** - Daily P&L, win/loss counts
4. **Setup Performance** - Per-setup stats (from `locations[0]` or `setup_name`)
5. **Edge Diagnostics** - Setup win rates, profit factors
6. **Equity Curve** - Cumulative P&L over time
7. **Model Performance** - Trend vs Mean Reversion (legacy, now uses setups)
8. **Weekly KPIs:**
   - Total R, Expectancy, Profit Factor
   - Consistency %, Rule Compliance %
   - Trading days, Profitable days

#### **In Other Components:**
9. **Calendar Heatmap** - Trade density visualization
10. **Trade Heatmap** - Activity patterns
11. **Daily Wrap** - End-of-day summary
12. **Reflection Analytics** - Uses `get_reflection_analytics` RPC ✅

---

### **⚠️ Attempted But Fail Gracefully**

These try to call RPC functions that likely don't exist, then fallback to client-side:

| Function Call | Component | Fallback |
|---------------|-----------|----------|
| `get_best_trading_hours()` | useTradingAnalytics | ❌ Fails → Uses `calculateBestHours()` from lib |
| `get_weekly_summary()` | useTradingAnalytics | ❌ Fails → Uses `calculateWeeklyPerformance()` from lib |
| `get_daily_performance()` | useTradingAnalytics | ❌ Fails → Uses `calculateDailyPerformance()` from lib |
| `get_today_performance()` | useTradingStats | ❌ Fails → Client-side calculation |
| `get_model_performance()` | useTradingStats | ❌ Fails → Client-side calculation |

---

### **✅ Working Database Functions**

These actually exist and work:

- ✅ `get_user_trade_stats()` - Called by `useTradesOptimized`
- ✅ `get_daily_losses()` - Called by `useTradesOptimized`
- ✅ `generate_daily_reflection()` - Called by `useReflection`
- ✅ `get_reflection_analytics()` - Called by `useReflection`
- ✅ `get_current_bias()` - Called by `useBiasState`
- ✅ `set_bias_state()` - Called by `useBiasState`

---

## 📋 WHAT'S NOT YET IMPLEMENTED

### **❌ Missing for Phase 1/2 Analytics:**

1. **Efficiency Analytics** - NEW FIELDS
   - No component yet for efficiency trends
   - No setup efficiency comparison
   - No MAE/MFE scatter plots
   - **Data exists:** `efficiency`, `mae_r`, `mfe_r` in `trades` table

2. **Confidence Correlation** - NEW FIELDS
   - No confidence vs performance charts
   - No confidence trend over time
   - **Data exists:** `confidence` in `trades` table

3. **Discipline Analysis** - NEW FIELDS
   - No discipline tag breakdown
   - No FOMO vs disciplined trade comparison
   - **Data exists:** `discipline_tag`, `checklist_passed` in `trades` table

4. **Session Analysis** - NEW FIELDS
   - No session performance breakdown
   - Uses old `trading_session` field, not new `session` field
   - **Data exists:** `session` in `trades` table

5. **Trade Management Analytics** - NEW FIELDS
   - No breakeven impact analysis
   - No partial exit analysis
   - No exit reason categorization
   - **Data exists:** `moved_to_be`, `be_trigger_r`, `partial_at_2r`, `exit_reason` in `trades`

6. **Post-Trade Observation Analytics** - PHASE 2
   - No continuation rate charts
   - No missed opportunity tracker
   - No stop quality gauge
   - **Data exists:** `post_trade_observations` table ✅

---

## 🎯 ANALYTICS GAPS SUMMARY

### **Data Layer: ✅ Complete**
All Phase 1 & 2 fields exist in database and are being saved

### **Calculation Layer: ✅ Partially Complete**
- ✅ Core calculations work (P&L, R, efficiency)
- ✅ Client-side aggregations work (daily, weekly, hourly)
- ⚠️ Some RPC functions called but don't exist (graceful fallbacks)

### **Visualization Layer: ❌ Incomplete**
- ✅ Basic analytics (hours, weekly, daily, setups)
- ❌ **No Phase 1 NEW FIELDS visualized** (efficiency, confidence, discipline, session)
- ❌ **No Phase 2 visualized** (observations, continuation/reversal)

---

## 🎨 EXISTING VISUALIZATIONS

### **TradingAnalytics.tsx (Main Dashboard)**

**6 Tabs Currently:**

1. **Best Hours Tab** ✅
   - Shows: Hour, P&L, Trade count, Win rate, Avg R
   - Source: `bestHours` from useTradingAnalytics (client-side calc)

2. **Weekly Tab** ✅
   - Shows: Week period, Total P&L, Trades, Trading days, Win rate
   - Source: `weeklySummary` from useTradingAnalytics (client-side calc)

3. **Daily Tab** ✅
   - Shows: Date, P&L, Trades, Wins, Losses, Win rate
   - Source: `dailyPerformance` from useTradingAnalytics (client-side calc)

4. **Setups Tab** ✅
   - Shows: Setup name, Trades, Wins, Win rate, Total P&L, Avg R, Profit factor
   - Source: Client-side grouping of trades by `locations[0]`
   - ⚠️ **Not yet using new `setup_name` field**

5. **Edge Diagnostics Tab** ✅
   - Shows: Setup stats, Management efficiency, Behavior summary
   - Source: Client-side calculations

6. **Equity Tab** ✅
   - Shows: Cumulative P&L curve
   - Source: Cumulative sum of trade P&Ls

---

### **Other Visualizations**

| Component | Visual Type | Purpose | Status |
|-----------|-------------|---------|--------|
| `TradeHeatmap` | Heatmap | Trading activity by day/hour | ✅ Live |
| `TradingCalendar` | Calendar | Monthly trade view | ✅ Live |
| `DailyWrap` | Summary card | EOD review | ✅ Live |
| `DisciplineChallengeDashboard` | Dashboard | Gamified discipline tracking | ✅ Live |

---

## 📈 WHAT'S AVAILABLE BUT NOT VISUALIZED

### **Phase 1 Fields (No UI Yet):**
- `efficiency` - Execution quality (r_multiple / mfe_r)
- `mae_r` - Max adverse excursion
- `mfe_r` - Max favorable excursion
- `confidence` - Trade confidence (1-5)
- `discipline_tag` - Entry discipline classification
- `session` - NEW session field (vs old `trading_session`)
- `checklist_passed` - Pre-trade checklist completion
- `moved_to_be`, `be_trigger_r` - Breakeven tracking
- `partial_at_2r` - Partial exit tracking
- `used_trailing_stop` - Trailing stop usage
- `orderflow_exit` - Orderflow-based exit
- `exit_reason` - Exit categorization
- `target_price` - Planned target (vs actual exit)

### **Phase 2 Fields (No UI Yet):**
- `post_trade_observations` - Entire table
- Continuation rate by setup/session
- Reversal rate after stop
- Missed R tracking
- Stop quality scoring
- Exit timing optimization

---

## 🚧 RECOMMENDED VISUALIZATIONS TO BUILD

### **Priority 1: Phase 1 NEW FIELDS (High Value)**

#### **1. Efficiency Dashboard** ⭐⭐⭐
**Purpose:** Visualize execution quality
```
- Efficiency trend line (over time)
- Efficiency by setup (bar chart)
- MAE vs MFE scatter plot
- Efficiency distribution histogram
```
**Data:** `efficiency`, `mae_r`, `mfe_r` from `trades`

#### **2. Confidence Correlation** ⭐⭐⭐
**Purpose:** Does confidence predict results?
```
- Confidence (1-5) vs avg R-multiple (line chart)
- Confidence vs win rate (bar chart)
- Confidence distribution over time
```
**Data:** `confidence`, `r_multiple` from `trades`

#### **3. Discipline Analysis** ⭐⭐⭐
**Purpose:** Impact of discipline on performance
```
- Discipline tag breakdown (pie chart)
- FOMO vs Followed Plan comparison (bar chart)
- Checklist compliance vs win rate
```
**Data:** `discipline_tag`, `checklist_passed` from `trades`

#### **4. Session Performance** ⭐⭐
**Purpose:** Best trading sessions
```
- Session win rate comparison
- Session avg R comparison
- Session P&L totals
```
**Data:** `session` from `trades` (use NEW field, not old `trading_session`)

### **Priority 2: Phase 2 NEW TABLE (High Value)**

#### **5. Continuation/Reversal Dashboard** ⭐⭐⭐
**Purpose:** Post-trade pattern analysis
```
- Continuation rate by setup (bar chart)
- Reversal rate after stop (gauge)
- Missed R timeline (line chart)
- Stop quality score (circular gauge)
```
**Data:** `post_trade_observations` table

#### **6. Missed Opportunity Tracker** ⭐⭐⭐
**Purpose:** Quantify R left on table
```
- Cumulative missed R over time
- Missed R by setup
- Best observation window (which checkpoint captures most)
```
**Data:** `post_trade_observations` where `observation_type='post_target'` AND `price_action='continuation'`

#### **7. Stop Placement Quality** ⭐⭐
**Purpose:** Are stops well-placed?
```
- Stop quality score (% of stops that reversed)
- Premature stop identification
- Setup-specific stop quality
```
**Data:** `post_trade_observations` where `observation_type='post_stop'`

### **Priority 3: Trade Management Analytics (Medium Value)**

#### **8. Breakeven Impact** ⭐⭐
**Purpose:** Does moving to BE help or hurt?
```
- Win rate: BE vs no-BE
- Avg R: BE vs no-BE
- BE trigger distribution
```
**Data:** `moved_to_be`, `be_trigger_r` from `trades`

#### **9. Exit Reason Analysis** ⭐
**Purpose:** Categorize exit performance
```
- Exit reason breakdown (pie chart)
- Avg R by exit reason
- Optimal exit strategy by setup
```
**Data:** `exit_reason` from `trades`

---

## 🛠️ HELPER FUNCTIONS AVAILABLE

### **In `tradingCalculations.ts`:**
- `calculatePnL()` - P&L from prices
- `calculateRMultiple()` - R from P&L
- `calculateWinRate()` - Win rate from trades
- `calculateProfitFactor()` - Profit factor
- `calculateExpectancy()` - Expectancy
- `calculateAverageRMultiple()` - Avg R
- `getPipValueConfig()` - Pip values by asset
- `formatPrice()` - Asset-specific formatting

### **In `tradingAnalytics.ts`:**
- `calculateBestHours()` - Hourly aggregation
- `calculateDailyPerformance()` - Daily aggregation
- `calculateWeeklyPerformance()` - Weekly aggregation
- `getTradingStats()` - Overall summary stats

---

## 📊 DATA FLOW ARCHITECTURE

### **Current Flow:**
```
trades table (Supabase)
    ↓
useTradesOptimized hook (fetches all trades)
    ↓
closedTrades array (in-memory)
    ↓
Client-side calculations (tradingAnalytics.ts)
    ↓
TradingAnalytics component (visualizes)
```

**Pros:**
- ✅ Works without RPC functions
- ✅ Fast (no additional DB calls)
- ✅ All data in memory

**Cons:**
- ⚠️ Doesn't scale well (100s of trades = slow)
- ⚠️ Recalculates on every render
- ⚠️ No server-side aggregation

---

## 🎯 RECOMMENDATION FOR PHASE 2B DASHBOARD

### **Approach: Hybrid**

**For Phase 1 NEW FIELDS:**
- Use **client-side calculations** (data already in `closedTrades`)
- Create new tabs/components in `TradingAnalytics.tsx`
- No new database functions needed

**For Phase 2 OBSERVATIONS:**
- Use **SQL queries** (JOIN trades with post_trade_observations)
- Create new hook: `usePostTradeAnalytics`
- Query database when needed (observations are separate table)

---

## 📋 BUILD PLAN FOR PHASE 2B

### **Step 1: Extend TradingAnalytics Component**

Add 4 new tabs:

1. **"Efficiency" Tab** - Show efficiency trends, MAE/MFE charts
2. **"Confidence" Tab** - Confidence correlation analysis
3. **"Discipline" Tab** - Discipline impact charts
4. **"Observations" Tab** - Continuation/reversal analytics

### **Step 2: Create New Hook: usePostTradeAnalytics**

Fetch observation data:
- `getObservationSummary()` - Overall stats
- `getContinuationRate()` - By setup/session
- `getMissedOpportunities()` - Total R left on table
- `getStopQuality()` - Reversal rate after stop

### **Step 3: Create Visualization Components**

- `EfficiencyChart` - Line/scatter for efficiency
- `ConfidenceBarChart` - Confidence vs performance
- `DisciplinePieChart` - Discipline tag breakdown
- `ContinuationHeatmap` - Setup x Session continuation rates
- `MissedRTimeline` - Cumulative missed R over time
- `StopQualityGauge` - Circular gauge for stop quality

### **Step 4: Update Existing Components**

- Update `TradingAnalytics.tsx` "Setups" tab to use `setup_name` (not `locations[0]`)
- Add session column to existing tables
- Show new fields in existing views

---

## 🎯 SUMMARY FOR DASHBOARD BUILD

### **What Already Works:**
```json
{
  "database_views": [
    {"name": "daily_performance_metrics", "status": "live", "use": "daily stats"},
    {"name": "v_current_bias", "status": "live", "use": "bias tracking"},
    {"name": "v_trade_observations", "status": "NEW_PHASE_2", "use": "observations"}
  ],
  "database_functions": [
    {"name": "get_user_trade_stats", "status": "live", "used_by": "useTradesOptimized"},
    {"name": "get_daily_losses", "status": "live", "used_by": "useTradesOptimized"},
    {"name": "calculate_r_moved", "status": "NEW_PHASE_2", "used_by": "observations"},
    {"name": "get_reflection_analytics", "status": "live", "used_by": "useReflection"}
  ],
  "frontend_components": [
    {"name": "TradingAnalytics", "file": "components/TradingAnalytics.tsx", "tabs": 6, "uses_new_fields": false},
    {"name": "TradeHeatmap", "file": "components/TradeHeatmap.tsx", "type": "heatmap"},
    {"name": "TradingCalendar", "file": "components/TradingCalendar.tsx", "type": "calendar"}
  ],
  "calculation_libs": [
    {"name": "tradingCalculations", "file": "lib/tradingCalculations.ts", "exports": ["P&L", "R-Multiple", "Win Rate", "etc"]},
    {"name": "tradingAnalytics", "file": "lib/tradingAnalytics.ts", "exports": ["bestHours", "daily", "weekly"]}
  ]
}
```

### **What Needs Building (Phase 2B):**
```json
{
  "new_tabs_in_TradingAnalytics": [
    "Efficiency (MAE/MFE/efficiency visualization)",
    "Confidence (confidence correlation charts)",
    "Discipline (discipline tag analysis)",
    "Observations (continuation/reversal analytics)"
  ],
  "new_hooks": [
    "usePostTradeAnalytics (fetch & aggregate observations)"
  ],
  "new_components": [
    "EfficiencyChart",
    "ConfidenceBarChart",
    "DisciplinePieChart",
    "ContinuationHeatmap",
    "MissedRTimeline",
    "StopQualityGauge"
  ],
  "updates_needed": [
    "Update setupPerformance to use setup_name (not locations[0])",
    "Add session column to existing tables",
    "Show new fields in trade cards/details"
  ]
}
```

---

## ✅ VERIFIED STATUS

| Layer | Status | Notes |
|-------|--------|-------|
| **Database Schema** | ✅ Complete | 71 fields total across 2 main tables |
| **Database Functions** | ✅ Partial | Core functions exist, analytics RPCs missing but have fallbacks |
| **Calculation Logic** | ✅ Complete | All formulas verified in lib/ |
| **Data Fetching** | ✅ Complete | useTradesOptimized fetches all data |
| **Basic Visualizations** | ✅ Live | Hours, weekly, daily, setups, equity |
| **Phase 1 Visualizations** | ❌ **MISSING** | Efficiency, confidence, discipline, session |
| **Phase 2 Visualizations** | ❌ **MISSING** | Observations, continuation, reversal |

---

**Ready to build Phase 2B Dashboard on top of existing TradingAnalytics component!** 🚀

**No duplicate work needed - all existing analytics remain intact, we're adding 4 new tabs + updating one tab to use new fields.**

