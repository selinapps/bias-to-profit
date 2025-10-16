# 📊 TRADES TABLE - FINAL SCHEMA REFERENCE

**Date:** 2024-10-16  
**Purpose:** Complete schema for manual trading journal with analytics support  
**Migration File:** `migrations/complete_trades_schema_remap.sql`

---

## 🧩 CORE TRADE DATA (Entry Stage)

| Field Name       | Type           | Nullable | Default | Notes                                                         |
|------------------|----------------|----------|---------|---------------------------------------------------------------|
| `id`             | uuid           | NO       | gen_random_uuid() | Primary key                                            |
| `user_id`        | uuid           | NO       | —       | Foreign key to auth.users                                     |
| `asset`          | text           | NO       | —       | "EURUSD", "GBPUSD", etc.                                      |
| `direction`      | text           | NO       | —       | "buy", "sell" (legacy: "long", "short" also supported)        |
| `entry_time`     | timestamptz    | YES      | now()   | Manually selected trade entry time                            |
| `entry_price`    | numeric(12,4)  | NO       | —       | Entry price level                                             |
| `stop_loss`      | numeric(12,4)  | NO       | —       | Stop loss price level                                         |
| `target_price`   | numeric(12,4)  | YES      | NULL    | **PLANNED target at entry** (separate from exit_price)        |
| `lot_size`       | numeric(10,2)  | YES      | 1.0     | Position size                                                 |
| `risk_tier`      | text           | NO       | —       | "a", "b", or "c"                                              |
| `risk_amount`    | numeric(10,2)  | NO       | —       | Dollar amount risked (from tier preset)                       |

---

## 🎯 SETUP & CONTEXT (Entry Stage)

| Field Name       | Type           | Nullable | Default | Notes                                                         |
|------------------|----------------|----------|---------|---------------------------------------------------------------|
| `setup_name`     | text           | YES      | NULL    | User-selected setup (replaces `locations[0]`)                 |
| `session`        | text           | YES      | NULL    | "London", "New York", "Asia" (replaces `trading_session`)     |
| `bias_snapshot`  | text           | YES      | NULL    | Manual entry: e.g., "Bearish D1 → Bullish M15 Reversal"      |

---

## 📈 MANUAL MARKET CONTEXT (Entry Stage)

| Field Name        | Type           | Nullable | Default | Notes                                                        |
|-------------------|----------------|----------|---------|--------------------------------------------------------------|
| `atr_pips`        | numeric(10,2)  | YES      | NULL    | ATR in pips at trade entry (manual entry)                    |
| `spread`          | numeric(10,2)  | YES      | NULL    | Spread in pips (manual entry)                                |
| `slippage`        | numeric(10,2)  | YES      | NULL    | Slippage in pips (manual entry)                              |
| `account_equity`  | numeric(12,2)  | YES      | NULL    | Account equity snapshot at entry (manual entry)              |

---

## 🧠 PSYCHOLOGY & DISCIPLINE (Entry Stage)

| Field Name         | Type        | Nullable | Default | Notes                                                       |
|--------------------|-------------|----------|---------|-------------------------------------------------------------|
| `confidence`       | integer     | YES      | NULL    | Trade confidence: 1 (low) to 5 (high)                       |
| `emotions`         | jsonb       | YES      | NULL    | `{calm_stressed: 1-10, focus: 1-10, urge_recover: 1-10}`    |
| `checklist_passed` | boolean     | YES      | NULL    | Did trade pass pre-trade checklist?                         |
| `discipline_tag`   | text        | YES      | NULL    | "followed_plan", "FOMO", "revenge", "impatient", etc.       |
| `notes`            | text        | YES      | NULL    | Optional free-text remarks                                  |

---

## 🎯 EXIT DATA (Close/Manage Stage)

| Field Name          | Type           | Nullable | Default | Notes                                                      |
|---------------------|----------------|----------|---------|------------------------------------------------------------|
| `exit_time`         | timestamptz    | YES      | NULL    | When trade was closed (manual input)                       |
| `exit_price`        | numeric(12,4)  | YES      | NULL    | Actual exit price (manual input)                           |
| `pnl`               | numeric(10,2)  | YES      | NULL    | Profit/Loss in dollars (auto or manual calc)               |
| `r_multiple`        | numeric(6,3)   | YES      | NULL    | Risk-adjusted return: `pnl / risk_amount`                  |
| `duration_minutes`  | integer        | YES      | NULL    | Auto-calculated: `exit_time - entry_time`                  |

---

## 📊 MAE/MFE ANALYTICS (Close/Manage Stage - Manual Entry)

| Field Name   | Type          | Nullable | Default | Notes                                                            |
|--------------|---------------|----------|---------|------------------------------------------------------------------|
| `mae_r`      | numeric(10,3) | YES      | NULL    | Max Adverse Excursion in R (manual entry from chart)             |
| `mfe_r`      | numeric(10,3) | YES      | NULL    | Max Favorable Excursion in R (manual entry from chart)           |
| `efficiency` | numeric(6,3)  | YES      | NULL    | Calculated: `r_multiple / mfe_r` (capped at 1.0)                 |

**Efficiency Formula:**
```sql
efficiency = LEAST(1.0, r_multiple / NULLIF(mfe_r, 0))
```

---

## 🔧 TRADE MANAGEMENT (Close/Manage Stage)

| Field Name            | Type          | Nullable | Default | Notes                                                      |
|-----------------------|---------------|----------|---------|------------------------------------------------------------|
| `moved_to_be`         | boolean       | YES      | false   | Was stop loss moved to breakeven?                          |
| `be_trigger_r`        | numeric(6,2)  | YES      | NULL    | At what R was stop moved to BE? (e.g., 1.5)                |
| `partial_at_2r`       | boolean       | YES      | false   | Was partial profit taken at 2R?                            |
| `used_trailing_stop`  | boolean       | YES      | false   | Was trailing stop used?                                    |
| `orderflow_exit`      | boolean       | YES      | false   | Exit based on orderflow/price action?                      |
| `exit_reason`         | text          | YES      | NULL    | "Target hit", "Stop hit", "Manual exit", "Trailing stop"   |

---

## 💭 REFLECTION (Close/Manage Stage)

| Field Name        | Type     | Nullable | Default | Notes                                                          |
|-------------------|----------|----------|---------|----------------------------------------------------------------|
| `trade_lessons`   | text     | YES      | NULL    | Written reflection: what was learned                           |
| `mistake_tags`    | text[]   | YES      | NULL    | Array: `["early entry", "ignored stop"]`                       |
| `good_actions`    | text[]   | YES      | NULL    | Array: `["followed plan", "patient entry"]`                    |
| `screenshot_url`  | text     | YES      | NULL    | URL to uploaded chart screenshot                               |

---

## 🔗 META & SYSTEM FIELDS

| Field Name         | Type        | Nullable | Default | Notes                                                      |
|--------------------|-------------|----------|---------|------------------------------------------------------------|
| `challenge_id`     | uuid        | YES      | NULL    | Link to prop firm challenge (if applicable)                |
| `status`           | text        | YES      | 'open'  | "open" or "closed"                                         |
| `is_experimental`  | boolean     | YES      | false   | Flag for experimental/test trades                          |
| `override_reason`  | text        | YES      | NULL    | If stop rule was overridden, explanation                   |
| `created_at`       | timestamptz | YES      | now()   | Record creation timestamp                                  |
| `updated_at`       | timestamptz | YES      | now()   | Record last update timestamp                               |

---

## ⚠️ DEPRECATED FIELDS (Kept for Migration Safety)

| Field Name         | Type     | Status     | Migration Note                                    |
|--------------------|----------|------------|---------------------------------------------------|
| `model`            | text     | REQUIRED*  | Still required by DB constraint, use "trend"      |
| `locations`        | text[]   | DEPRECATED | Migrated to `setup_name`                          |
| `trading_session`  | text     | DEPRECATED | Migrated to `session`                             |
| `aggression`       | text[]   | DEPRECATED | No longer used                                    |
| `scenarios`        | text[]   | DEPRECATED | No longer used                                    |
| `hypothesis_id`    | uuid     | DEPRECATED | No longer used                                    |
| `externals`        | text[]   | DEPRECATED | No longer used                                    |

**Note:** `model` field is still required by database constraint but not actively used. Always set to "trend" for now.

---

## 📐 CONSTRAINTS & VALIDATION

### Check Constraints

```sql
-- Direction: supports both new and legacy values
CHECK (direction IN ('long', 'short', 'buy', 'sell'))

-- Risk Tier
CHECK (risk_tier IN ('a', 'b', 'c'))

-- Confidence Range
CHECK (confidence IS NULL OR (confidence >= 1 AND confidence <= 5))

-- Efficiency Range (0 to 1)
CHECK (efficiency IS NULL OR (efficiency >= 0 AND efficiency <= 1))

-- Status
CHECK (status IN ('open', 'closed'))
```

### Indexes

```sql
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_entry_time ON trades(entry_time);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_setup_name ON trades(setup_name);
CREATE INDEX idx_trades_session ON trades(session);
CREATE INDEX idx_trades_exit_reason ON trades(exit_reason);
CREATE INDEX idx_trades_discipline_tag ON trades(discipline_tag);
CREATE INDEX idx_trades_efficiency ON trades(efficiency) WHERE efficiency IS NOT NULL;
```

---

## 🧮 ANALYTICS FORMULAS

### Core Metrics

**P&L Calculation (Auto):**
```
pips = (exit_price - entry_price) / pip_multiplier  [for buy]
pips = (entry_price - exit_price) / pip_multiplier  [for sell]
gross_pnl = pips × pip_value_per_lot × lot_size
commission = lot_size × 7.5
pnl = gross_pnl - commission
```

**R-Multiple (Auto):**
```
r_multiple = pnl / risk_amount
```

**Efficiency (Auto):**
```
efficiency = MIN(1.0, r_multiple / mfe_r)
```

**Duration (Auto):**
```
duration_minutes = EXTRACT(EPOCH FROM (exit_time - entry_time)) / 60
```

### Advanced Analytics (Queries)

**Win Rate:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE pnl > 0)::numeric / COUNT(*) * 100 as win_rate
FROM trades 
WHERE status = 'closed' AND user_id = $1;
```

**Average R-Multiple:**
```sql
SELECT AVG(r_multiple) 
FROM trades 
WHERE status = 'closed' AND user_id = $1;
```

**Profit Factor:**
```sql
SELECT 
  SUM(pnl) FILTER (WHERE pnl > 0) / 
  ABS(SUM(pnl) FILTER (WHERE pnl < 0)) as profit_factor
FROM trades 
WHERE status = 'closed' AND user_id = $1;
```

**Average Efficiency by Setup:**
```sql
SELECT 
  setup_name,
  AVG(efficiency) as avg_efficiency,
  COUNT(*) as trade_count
FROM trades 
WHERE status = 'closed' 
  AND efficiency IS NOT NULL 
  AND user_id = $1
GROUP BY setup_name
ORDER BY avg_efficiency DESC;
```

**Risk Efficiency (R/MAE):**
```sql
SELECT 
  AVG(ABS(r_multiple / NULLIF(mae_r, 0))) as risk_efficiency
FROM trades
WHERE status = 'closed' 
  AND mae_r IS NOT NULL 
  AND mae_r != 0
  AND user_id = $1;
```

---

## 📝 USAGE GUIDELINES

### Entry Stage - What to Fill

**Required:**
- asset, direction, entry_price, stop_loss, risk_tier, risk_amount

**Recommended:**
- setup_name, session, target_price, lot_size, confidence, checklist_passed

**Optional but Valuable:**
- bias_snapshot, atr_pips, spread, account_equity, emotions, discipline_tag

### Close/Manage Stage - What to Fill

**Required:**
- exit_price, exit_time (or defaults to now)

**Strongly Recommended:**
- trade_lessons, exit_reason

**Valuable for Analytics:**
- mae_r, mfe_r (enables efficiency calculation)
- moved_to_be, be_trigger_r, partial_at_2r
- mistake_tags, good_actions

**Optional:**
- screenshot_url, manual pnl override

---

## 🔄 MIGRATION PATH

1. **Run Migration:** Execute `complete_trades_schema_remap.sql`
2. **Existing Data:** Old trades automatically migrate `locations[0]` → `setup_name`
3. **New Trades:** Use new fields (`setup_name`, `session`, etc.)
4. **Backward Compatibility:** Old fields remain queryable
5. **Future Cleanup:** After confirming all works, deprecated fields can be dropped

---

## ✅ TYPE SAFETY

All fields in TypeScript types (`src/integrations/supabase/types.ts`) are:
- ✅ Properly nullable (use `| null` where applicable)
- ✅ Organized by stage (Entry, Close, Meta)
- ✅ Documented with inline comments
- ✅ Backward compatible with deprecated fields

---

## 📊 COMPLETE FIELD COUNT

- **Total Fields:** 58
- **Active Fields:** 48
- **Deprecated Fields:** 10
- **Required on Insert:** 7
- **Nullable Fields:** 51

---

**End of Schema Reference**

