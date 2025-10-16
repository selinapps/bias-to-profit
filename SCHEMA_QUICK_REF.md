# 📋 Trades Schema - Quick Reference Card

> **TL;DR:** Clean, stable schema with 48 fields for manual trading journal. All nullable. TypeScript typed. Analytics ready.

---

## 🚀 Quick Start

```bash
# 1. Apply migration (copy/paste into Supabase SQL Editor)
migrations/complete_trades_schema_remap.sql

# 2. Verify it worked
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'trades' AND column_name = 'setup_name';
# Should return 1 row

# 3. Update your forms (see SCHEMA_MIGRATION_GUIDE.md)
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `TRADES_SCHEMA_FINAL.md` | **Complete reference** - All 48 fields, types, constraints |
| `SCHEMA_MIGRATION_GUIDE.md` | **Implementation steps** - How to apply and test migration |
| `SCHEMA_REMAP_SUMMARY.md` | **What changed** - Before/after comparison, analytics queries |
| `SCHEMA_QUICK_REF.md` | **This file** - Quick lookup for common tasks |

---

## 🎯 Field Groups (What Goes Where)

### 📝 ENTRY FORM - Basic (Required)
```typescript
{
  asset: "EURUSD",
  direction: "buy",
  entry_price: 1.1000,
  stop_loss: 1.0950,
  risk_tier: "a",
  risk_amount: 500,
  model: "trend" // Still required by DB
}
```

### 📝 ENTRY FORM - Setup & Context (Recommended)
```typescript
{
  setup_name: "OTE Entry",           // NEW - was locations[0]
  session: "London",                 // NEW - was trading_session
  target_price: 1.1050,              // NEW - separate from exit_price
  confidence: 4,                     // NEW - 1-5 scale
  bias_snapshot: "Bearish D1...",    // NEW - manual text
  checklist_passed: true,            // NEW
}
```

### 📝 ENTRY FORM - Market Data (Optional)
```typescript
{
  atr_pips: 45.2,        // Manual entry
  spread: 1.2,           // Manual entry
  slippage: 0.5,         // Manual entry
  account_equity: 10000, // Manual entry
}
```

### 🎯 CLOSE FORM - Required
```typescript
{
  exit_price: 1.1045,
  exit_time: "2024-10-16T15:30:00Z",
}
```

### 🎯 CLOSE FORM - Analytics (Highly Recommended)
```typescript
{
  mae_r: -0.35,      // Max drawdown in R (manual from chart)
  mfe_r: 2.8,        // Max profit in R (manual from chart)
  efficiency: 0.75,  // Auto-calculated: r_multiple / mfe_r
  exit_reason: "Target hit",
}
```

### 🎯 CLOSE FORM - Trade Management
```typescript
{
  moved_to_be: true,
  be_trigger_r: 1.5,
  partial_at_2r: false,
  used_trailing_stop: true,
  orderflow_exit: false,
}
```

---

## 🧮 Auto-Calculated Fields

These are calculated automatically - **don't input manually:**

```typescript
{
  pnl: 435.00,              // (pips × pip_value × lot_size) - commission
  r_multiple: 0.870,        // pnl / risk_amount
  efficiency: 0.75,         // r_multiple / mfe_r (if mfe_r provided)
  duration_minutes: 75,     // exit_time - entry_time
}
```

---

## 📊 Top 5 Analytics Queries

### 1. Efficiency by Setup
```sql
SELECT setup_name, AVG(efficiency) as eff, COUNT(*) as n
FROM trades 
WHERE status = 'closed' AND efficiency IS NOT NULL
GROUP BY setup_name ORDER BY eff DESC;
```

### 2. Win Rate & Avg R by Session
```sql
SELECT 
  session,
  COUNT(*) FILTER (WHERE pnl > 0)::float / COUNT(*) * 100 as win_rate,
  AVG(r_multiple) as avg_r
FROM trades 
WHERE status = 'closed' AND session IS NOT NULL
GROUP BY session;
```

### 3. Confidence vs Performance
```sql
SELECT 
  confidence,
  AVG(r_multiple) as avg_r,
  AVG(efficiency) as avg_eff,
  COUNT(*) as trades
FROM trades 
WHERE confidence IS NOT NULL
GROUP BY confidence ORDER BY confidence;
```

### 4. Breakeven Impact
```sql
SELECT 
  moved_to_be,
  AVG(efficiency) as avg_eff,
  AVG(r_multiple) as avg_r,
  COUNT(*) as trades
FROM trades 
WHERE status = 'closed'
GROUP BY moved_to_be;
```

### 5. Discipline Impact
```sql
SELECT 
  checklist_passed,
  COUNT(*) FILTER (WHERE pnl > 0)::float / COUNT(*) * 100 as win_rate,
  AVG(r_multiple) as avg_r
FROM trades 
WHERE checklist_passed IS NOT NULL
GROUP BY checklist_passed;
```

---

## 🔧 Common Code Patterns

### Safe Field Access (Avoid Crashes)
```typescript
// ✅ Good - handles null/undefined
const setupName = trade?.setup_name ?? 'Unknown';
const confidence = trade?.confidence || 3;
const efficiency = trade?.efficiency ?? 0;

// ❌ Bad - can crash
const setupName = trade.setup_name;  // Error if null
```

### Insert New Trade
```typescript
await supabase.from('trades').insert({
  // Required
  asset: 'EURUSD',
  direction: 'buy',
  entry_price: 1.1000,
  stop_loss: 1.0950,
  risk_tier: 'a',
  risk_amount: 500,
  user_id: userId,
  model: 'trend',
  
  // Recommended
  setup_name: 'OTE Entry',
  session: 'London',
  target_price: 1.1050,
  confidence: 4,
  
  // Optional - all nullable, safe to omit
  mae_r: null,
  mfe_r: null,
  bias_snapshot: null,
});
```

### Update on Close
```typescript
await supabase.from('trades').update({
  status: 'closed',
  exit_price: 1.1045,
  exit_time: new Date().toISOString(),
  pnl: 435.00,
  r_multiple: 0.870,
  
  // New analytics fields
  mae_r: -0.35,
  mfe_r: 2.8,
  efficiency: 0.75,
  exit_reason: 'Target hit',
  moved_to_be: true,
  be_trigger_r: 1.5,
}).eq('id', tradeId);
```

---

## ⚡ Field Name Changes (Migration Map)

| Old Field | New Field | Status |
|-----------|-----------|--------|
| `locations[0]` | `setup_name` | ✅ Migrated |
| `trading_session` | `session` | ✅ Migrated |
| `exit_price` (at entry) | `target_price` | ✅ Separated |
| `bias_snapshot` (jsonb) | `bias_snapshot` (text) | ✅ Changed type |

**Old fields still work** - backward compatible during migration.

---

## 🎨 UI Input Widgets Needed

### Entry Screen
- [ ] Setup dropdown → `setup_name`
- [ ] Session dropdown → `session`
- [ ] Target price input → `target_price`
- [ ] Confidence slider (1-5) → `confidence`
- [ ] Bias text input → `bias_snapshot`
- [ ] Checklist checkboxes → `checklist_passed`
- [ ] ATR/Spread/Equity inputs → `atr_pips`, `spread`, `account_equity`

### Close Screen
- [ ] Exit price input → `exit_price`
- [ ] Exit time picker → `exit_time`
- [ ] MAE input → `mae_r`
- [ ] MFE input → `mfe_r`
- [ ] Exit reason dropdown → `exit_reason`
- [ ] Trade mgmt checkboxes → `moved_to_be`, `partial_at_2r`, etc.

---

## 🔥 Most Valuable New Fields

### For Execution Quality:
1. **`efficiency`** - Did you capture available R?
2. **`mae_r`** - How much heat did you take?
3. **`mfe_r`** - How much was available?

### For Setup Analysis:
1. **`setup_name`** - Clean setup tracking
2. **`session`** - Session performance
3. **`confidence`** - Confidence vs results

### For Discipline:
1. **`checklist_passed`** - Pre-trade discipline
2. **`discipline_tag`** - Classification
3. **`exit_reason`** - Exit categorization

---

## 🚨 Common Mistakes to Avoid

### ❌ Don't Do This:
```typescript
// Using old field names
locations: ['OTE Entry'],  // Use setup_name instead
trading_session: 'London', // Use session instead

// Setting exit_price at entry
exit_price: targetPrice,   // Use target_price instead

// Forgetting model field
// (Still required by DB constraint - set to 'trend')
```

### ✅ Do This Instead:
```typescript
setup_name: 'OTE Entry',
session: 'London',
target_price: 1.1050,
model: 'trend',  // Still required
```

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Column does not exist" | Run migration SQL first |
| "Null constraint violation" | Missing `model` field (set to "trend") |
| TypeScript errors | Restart TS server, check types.ts updated |
| Old trades show NULL | Expected - only new trades have new fields |
| Efficiency always NULL | Need to provide `mfe_r` to calculate it |

---

## 🎯 Success Criteria

✅ Migration SQL runs without errors  
✅ New columns appear in database  
✅ Can insert trade with `setup_name`  
✅ Can close trade with `mae_r` and `mfe_r`  
✅ `efficiency` auto-calculates  
✅ No null pointer errors in UI  
✅ Analytics queries return data  

---

## 📖 Full Documentation

For complete details, see:
- **Schema Reference:** `TRADES_SCHEMA_FINAL.md`
- **Migration Steps:** `SCHEMA_MIGRATION_GUIDE.md`
- **What Changed:** `SCHEMA_REMAP_SUMMARY.md`

---

**Last Updated:** 2024-10-16  
**Schema Version:** 2.0 (Manual Workflow)  
**Total Fields:** 48 active + 10 deprecated

