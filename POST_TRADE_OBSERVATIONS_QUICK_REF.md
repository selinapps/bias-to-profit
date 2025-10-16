# 📊 Post-Trade Observations - Analytics Quick Reference

**Table:** `post_trade_observations`  
**Purpose:** Track what price did after trade closed  
**Created:** Phase 2 - 2024-10-16

---

## 📋 TABLE SCHEMA

| Field | Type | Purpose |
|-------|------|---------|
| `id` | uuid | Primary key |
| `trade_id` | uuid | Foreign key to trades |
| `user_id` | uuid | Foreign key to auth.users |
| `observation_type` | text | 'post_stop' or 'post_target' |
| `observation_time` | text | '15m', '1h', '4h', 'EOD', 'next_day' |
| `observed_at` | timestamptz | When observation was recorded |
| `price_action` | text | 'continuation', 'reversal', 'consolidation', 'unclear' |
| `peak_price` | numeric | Highest/lowest price reached |
| `pips_moved` | numeric | Pips from exit point |
| `r_moved` | numeric | R-multiples from exit |
| `notes` | text | Optional context |

---

## 🔍 CORE ANALYTICS QUERIES

### 1. Reversal Rate After Stop Hit
```sql
-- How often does price reverse after hitting your stop?
SELECT 
  t.setup_name,
  COUNT(*) as stopped_trades,
  COUNT(*) FILTER (WHERE o.price_action = 'reversal')::float / COUNT(*) * 100 as reversal_rate,
  AVG(o.r_moved) FILTER (WHERE o.price_action = 'reversal') as avg_r_reversal,
  COUNT(*) FILTER (WHERE o.price_action = 'continuation')::float / COUNT(*) * 100 as continuation_rate
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE o.observation_type = 'post_stop'
  AND t.status = 'closed'
  AND t.r_multiple < 0  -- Lost trades only
  AND t.user_id = auth.uid()
GROUP BY t.setup_name
ORDER BY reversal_rate DESC;
```

**Insight:** "OTE entries reverse 65% of the time within 1hr after stop hit"

---

### 2. Continuation Rate After Target Hit
```sql
-- How often does price continue beyond your target?
SELECT 
  t.setup_name,
  COUNT(*) as target_hit_trades,
  COUNT(*) FILTER (WHERE o.price_action = 'continuation')::float / COUNT(*) * 100 as continuation_rate,
  AVG(o.r_moved) FILTER (WHERE o.price_action = 'continuation') as avg_extra_r,
  AVG(o.r_moved) as avg_all_r
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE o.observation_type = 'post_target'
  AND t.status = 'closed'
  AND t.r_multiple > 0  -- Winning trades only
  AND t.user_id = auth.uid()
GROUP BY t.setup_name
ORDER BY avg_extra_r DESC;
```

**Insight:** "Breakout trades continue +2.3R beyond target 70% of the time"

---

### 3. Optimal Observation Window
```sql
-- Which checkpoint shows the most movement?
SELECT 
  observation_time,
  COUNT(*) as observations,
  AVG(ABS(r_moved)) as avg_r_moved,
  AVG(r_moved) FILTER (WHERE price_action = 'continuation') as avg_continuation_r,
  AVG(r_moved) FILTER (WHERE price_action = 'reversal') as avg_reversal_r
FROM post_trade_observations
WHERE user_id = auth.uid()
GROUP BY observation_time
ORDER BY observation_time;
```

**Insight:** "4hr checkpoint captures most significant moves"

---

### 4. Missed Opportunity Tracker
```sql
-- Total R left on the table (post-target continuations)
SELECT 
  DATE(t.exit_time) as trade_date,
  COUNT(*) as trades_with_continuation,
  SUM(o.r_moved) as total_r_missed,
  AVG(o.r_moved) as avg_r_missed
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE o.observation_type = 'post_target'
  AND o.price_action = 'continuation'
  AND o.r_moved > 0
  AND t.user_id = auth.uid()
GROUP BY DATE(t.exit_time)
ORDER BY trade_date DESC
LIMIT 30;
```

**Insight:** "Left 12.5R on table last week across 8 trades"

---

### 5. Stop Placement Quality
```sql
-- Were your stops placed well? (reversal after stop = good)
SELECT 
  t.setup_name,
  t.session,
  COUNT(*) as stopped_trades,
  COUNT(*) FILTER (WHERE o.price_action = 'reversal') as good_stops,
  COUNT(*) FILTER (WHERE o.price_action = 'reversal')::float / COUNT(*) * 100 as stop_quality_score,
  AVG(o.r_moved) FILTER (WHERE o.price_action = 'reversal') as avg_r_saved
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE o.observation_type = 'post_stop'
  AND t.user_id = auth.uid()
GROUP BY t.setup_name, t.session
ORDER BY stop_quality_score DESC;
```

**Insight:** "London session stops reverse 80% of the time (good placement)"

---

### 6. Exit Efficiency Analysis
```sql
-- How efficiently are you exiting trades?
SELECT 
  t.setup_name,
  -- Current efficiency (captured R / MFE)
  AVG(t.efficiency) as capture_efficiency,
  -- Missed efficiency (extra R available / total possible R)
  AVG(o.r_moved) FILTER (WHERE o.observation_type = 'post_target' AND o.price_action = 'continuation') as avg_missed_r,
  -- Overall exit quality
  AVG(t.efficiency) / (AVG(t.efficiency) + AVG(o.r_moved) FILTER (WHERE o.observation_type = 'post_target' AND o.price_action = 'continuation')) as exit_quality_score
FROM trades t
LEFT JOIN post_trade_observations o ON t.id = o.trade_id
WHERE t.status = 'closed'
  AND t.efficiency IS NOT NULL
  AND t.user_id = auth.uid()
GROUP BY t.setup_name
ORDER BY exit_quality_score DESC;
```

**Insight:** "Exiting at 75% of optimal on OTE trades (25% left on table)"

---

### 7. Session-Specific Continuation Patterns
```sql
-- Which sessions favor holding longer?
SELECT 
  t.session,
  COUNT(*) as observations,
  COUNT(*) FILTER (WHERE o.price_action = 'continuation')::float / COUNT(*) * 100 as continuation_rate,
  AVG(o.r_moved) FILTER (WHERE o.price_action = 'continuation') as avg_continuation_r
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE o.observation_type = 'post_target'
  AND t.session IS NOT NULL
  AND t.user_id = auth.uid()
GROUP BY t.session
ORDER BY continuation_rate DESC;
```

**Insight:** "Silver Bullet trades continue 85% of time, avg +3.1R more available"

---

### 8. Breakeven Impact on Continuation
```sql
-- Does moving to BE affect continuation probability?
SELECT 
  t.moved_to_be,
  COUNT(*) as trades,
  COUNT(*) FILTER (WHERE o.price_action = 'continuation')::float / COUNT(*) * 100 as continuation_rate,
  AVG(o.r_moved) as avg_r_after_exit
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE o.observation_type = 'post_target'
  AND t.user_id = auth.uid()
GROUP BY t.moved_to_be;
```

**Insight:** "Moving to BE reduces continuation R from +2.5R to +1.2R"

---

### 9. Time Decay Analysis
```sql
-- Does continuation weaken over time?
SELECT 
  o.observation_time,
  COUNT(*) FILTER (WHERE o.price_action = 'continuation') as continuations,
  COUNT(*) FILTER (WHERE o.price_action = 'reversal') as reversals,
  AVG(ABS(o.r_moved)) as avg_r_magnitude
FROM post_trade_observations o
WHERE user_id = auth.uid()
GROUP BY o.observation_time
ORDER BY 
  CASE observation_time
    WHEN '15m' THEN 1
    WHEN '1h' THEN 2
    WHEN '4h' THEN 3
    WHEN 'EOD' THEN 4
    WHEN 'next_day' THEN 5
  END;
```

**Insight:** "Most reversals happen within 15m, strongest continuations at 4h"

---

### 10. Win vs Loss Observation Patterns
```sql
-- Different patterns for wins vs losses?
SELECT 
  CASE WHEN t.r_multiple > 0 THEN 'Winning Trades' ELSE 'Losing Trades' END as trade_type,
  o.observation_type,
  o.price_action,
  COUNT(*) as count,
  AVG(o.r_moved) as avg_r_moved
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE t.user_id = auth.uid()
GROUP BY trade_type, o.observation_type, o.price_action
ORDER BY trade_type, o.observation_type, avg_r_moved DESC;
```

**Insight:** "Winners continue +2.1R avg, losers reverse +1.3R avg"

---

## 🎯 QUICK INSIGHTS QUERIES

### Overall Observation Summary
```sql
SELECT 
  COUNT(DISTINCT trade_id) as trades_observed,
  COUNT(*) as total_observations,
  AVG(r_moved) as avg_r_impact,
  COUNT(*) FILTER (WHERE price_action = 'continuation') as continuations,
  COUNT(*) FILTER (WHERE price_action = 'reversal') as reversals
FROM post_trade_observations
WHERE user_id = auth.uid();
```

### Latest Observations
```sql
SELECT 
  t.asset,
  t.setup_name,
  t.r_multiple as trade_result,
  o.observation_type,
  o.price_action,
  o.r_moved,
  o.observation_time,
  o.observed_at
FROM post_trade_observations o
JOIN trades t ON o.trade_id = t.id
WHERE o.user_id = auth.uid()
ORDER BY o.observed_at DESC
LIMIT 10;
```

### Biggest Missed Opportunities
```sql
SELECT 
  t.asset,
  t.setup_name,
  t.r_multiple as captured_r,
  o.r_moved as missed_r,
  (t.r_multiple + o.r_moved) as potential_r,
  o.observation_time
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE o.observation_type = 'post_target'
  AND o.price_action = 'continuation'
  AND o.r_moved > 0
  AND t.user_id = auth.uid()
ORDER BY o.r_moved DESC
LIMIT 10;
```

---

## 📈 DASHBOARD METRICS

### Key Performance Indicators (KPIs)

**1. Stop Quality Score**
```
Good Stops / Total Stops × 100
(Where "good" = price reversed after stop)
```

**2. Exit Timing Score**
```
Captured R / (Captured R + Avg Continuation R) × 100
```

**3. Missed R per Week**
```
SUM(r_moved) WHERE observation_type = 'post_target' AND price_action = 'continuation'
```

**4. Optimal Hold Time**
```
Observation window with highest avg continuation R
```

---

## 🔧 USEFUL FUNCTIONS

### Get Observations for Trade
```sql
SELECT *
FROM post_trade_observations
WHERE trade_id = 'YOUR_TRADE_ID'
ORDER BY observed_at DESC;
```

### Calculate Total Missed R (User)
```sql
SELECT 
  SUM(r_moved) FILTER (WHERE observation_type = 'post_target' AND price_action = 'continuation' AND r_moved > 0) as total_missed_r,
  COUNT(*) FILTER (WHERE observation_type = 'post_target' AND price_action = 'continuation' AND r_moved > 0) as trades_continued,
  AVG(r_moved) FILTER (WHERE observation_type = 'post_target' AND price_action = 'continuation' AND r_moved > 0) as avg_missed_per_trade
FROM post_trade_observations
WHERE user_id = auth.uid();
```

### Setup Continuation Probability
```sql
SELECT 
  t.setup_name,
  COUNT(*) FILTER (WHERE o.price_action = 'continuation')::float / 
    COUNT(*)::float * 100 as continuation_probability,
  AVG(o.r_moved) FILTER (WHERE o.price_action = 'continuation') as avg_extra_r_if_continued
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE o.observation_type = 'post_target'
  AND t.user_id = auth.uid()
GROUP BY t.setup_name;
```

---

## 🎯 USE CASES

### **Use Case 1: "Am I exiting too early?"**
```sql
-- Check if your winning trades typically continue
SELECT 
  COUNT(*) as winning_trades,
  COUNT(*) FILTER (WHERE o.price_action = 'continuation' AND o.r_moved > 1) as significant_continuations,
  AVG(o.r_moved) FILTER (WHERE o.price_action = 'continuation') as avg_missed_r
FROM trades t
LEFT JOIN post_trade_observations o ON t.id = o.trade_id AND o.observation_type = 'post_target'
WHERE t.r_multiple > 0
  AND t.user_id = auth.uid();
```

**If avg_missed_r > 1.0:** Consider trailing stops or later profit targets

---

### **Use Case 2: "Are my stops too tight?"**
```sql
-- Check if price frequently reverses after stop
SELECT 
  COUNT(*) as stopped_trades,
  COUNT(*) FILTER (WHERE o.price_action = 'reversal')::float / COUNT(*) * 100 as premature_stop_rate,
  AVG(o.r_moved) FILTER (WHERE o.price_action = 'reversal') as avg_r_it_reversed
FROM trades t
LEFT JOIN post_trade_observations o ON t.id = o.trade_id AND o.observation_type = 'post_stop'
WHERE t.r_multiple < 0
  AND t.user_id = auth.uid();
```

**If premature_stop_rate > 50%:** Consider wider stops or better entry timing

---

### **Use Case 3: "Which setups should I scale out of?"**
```sql
-- Setups with high continuation rate = good candidates for scaling
SELECT 
  t.setup_name,
  COUNT(*) as trades,
  AVG(t.r_multiple) as avg_captured_r,
  AVG(o.r_moved) FILTER (WHERE o.price_action = 'continuation') as avg_continuation_r,
  COUNT(*) FILTER (WHERE o.price_action = 'continuation')::float / COUNT(*) * 100 as continuation_rate
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE o.observation_type = 'post_target'
  AND t.user_id = auth.uid()
GROUP BY t.setup_name
HAVING COUNT(*) >= 5  -- Min 5 trades
ORDER BY continuation_rate DESC;
```

**If continuation_rate > 60%:** Good candidate for partial exits and trailing stops

---

### **Use Case 4: "Session-specific hold times"**
```sql
-- Best observation windows per session
SELECT 
  t.session,
  o.observation_time,
  AVG(ABS(o.r_moved)) as avg_movement,
  COUNT(*) as observations
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE t.session IS NOT NULL
  AND t.user_id = auth.uid()
GROUP BY t.session, o.observation_time
ORDER BY t.session, avg_movement DESC;
```

**Insight:** "London: Check at 1h | NY: Check at 4h | Asian: EOD"

---

## 📊 ADVANCED ANALYTICS

### Continuation vs Efficiency Correlation
```sql
-- Do high-efficiency exits leave less on table?
SELECT 
  CASE 
    WHEN t.efficiency >= 0.8 THEN 'High Efficiency (0.8+)'
    WHEN t.efficiency >= 0.5 THEN 'Medium Efficiency (0.5-0.8)'
    ELSE 'Low Efficiency (<0.5)'
  END as efficiency_tier,
  AVG(o.r_moved) FILTER (WHERE o.price_action = 'continuation') as avg_missed_r,
  COUNT(*) as trades
FROM trades t
LEFT JOIN post_trade_observations o ON t.id = o.trade_id AND o.observation_type = 'post_target'
WHERE t.efficiency IS NOT NULL
  AND t.user_id = auth.uid()
GROUP BY efficiency_tier
ORDER BY efficiency_tier DESC;
```

---

### Discipline Impact on Continuation
```sql
-- Do disciplined entries have different continuation patterns?
SELECT 
  t.discipline_tag,
  AVG(o.r_moved) FILTER (WHERE o.observation_type = 'post_target' AND o.price_action = 'continuation') as avg_continuation_r,
  AVG(o.r_moved) FILTER (WHERE o.observation_type = 'post_stop' AND o.price_action = 'reversal') as avg_reversal_r,
  COUNT(*) as trades_observed
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE t.discipline_tag IS NOT NULL
  AND t.user_id = auth.uid()
GROUP BY t.discipline_tag
ORDER BY avg_continuation_r DESC;
```

---

### Confidence vs Continuation
```sql
-- Do high-confidence trades continue more?
SELECT 
  t.confidence,
  COUNT(*) FILTER (WHERE o.price_action = 'continuation')::float / COUNT(*) * 100 as continuation_rate,
  AVG(o.r_moved) as avg_r_impact
FROM trades t
JOIN post_trade_observations o ON t.id = o.trade_id
WHERE t.confidence IS NOT NULL
  AND o.observation_type = 'post_target'
  AND t.user_id = auth.uid()
GROUP BY t.confidence
ORDER BY t.confidence;
```

---

## 🎨 VISUALIZATION IDEAS

### 1. **Continuation Heatmap**
- X-axis: Setup Name
- Y-axis: Observation Time (15m, 1h, 4h)
- Color: Continuation Rate (%)

### 2. **Missed R Timeline**
- Line chart showing cumulative missed R over time
- Identify periods of premature exits

### 3. **Stop Quality Gauge**
- Circular gauge: Reversal Rate after stop
- 0-50%: Poor stops | 50-70%: Good | 70%+: Excellent

### 4. **Exit Efficiency Scatter**
- X-axis: Captured R (actual r_multiple)
- Y-axis: Missed R (post-target continuation)
- Bubbles: Trade count
- Identify optimal exit timing

---

## 🔄 COMMON PATTERNS

### Join Trades with Observations
```sql
SELECT 
  t.*,
  o.observation_type,
  o.price_action,
  o.r_moved,
  o.observation_time
FROM trades t
LEFT JOIN post_trade_observations o ON t.id = o.trade_id
WHERE t.user_id = auth.uid()
ORDER BY t.exit_time DESC;
```

### Filter by Observation Type
```sql
-- Only trades with post-target observations
SELECT t.*
FROM trades t
WHERE EXISTS (
  SELECT 1 FROM post_trade_observations
  WHERE trade_id = t.id 
    AND observation_type = 'post_target'
)
AND t.user_id = auth.uid();
```

---

## 📋 QUICK REFERENCE

**Observation Types:**
- `post_stop` - Price action after stop loss hit
- `post_target` - Price action after target hit

**Price Actions:**
- `continuation` - Kept moving same direction (missed opportunity if post_target)
- `reversal` - Turned around (good exit if post_target, premature stop if post_stop)
- `consolidation` - Went sideways
- `unclear` - Choppy/indecisive

**Observation Times:**
- `15m` - 15 minutes after exit
- `1h` - 1 hour after exit
- `4h` - 4 hours after exit
- `EOD` - End of trading day
- `next_day` - Next trading day

---

## 🎯 RECOMMENDED WORKFLOW

1. **Close trade** - Record MAE/MFE, exit reason
2. **Set timer** - Come back in 1hr (or your preferred window)
3. **Add observation** - Record what price did
4. **Review weekly** - Run analytics queries
5. **Adjust strategy** - Based on continuation/reversal patterns

---

**Last Updated:** 2024-10-16  
**Version:** Phase 2.0  
**Status:** ✅ Live and Ready

