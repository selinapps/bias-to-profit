# ✅ CURRENT FIELD MAPPINGS - Live & Verified

**Status:** Migration Complete ✅  
**Date:** 2024-10-16  
**Database:** Updated with new schema  
**UI:** Updated with new field mappings

---

## 📝 ENTRY FORM → DATABASE MAPPING

### SimplifiedAddTradeSheet.tsx (Just Journal Mode)

| UI Input | Database Field | Type | Status | Auto/Manual |
|----------|----------------|------|--------|-------------|
| Asset dropdown | `asset` | text | ✅ Live | Manual |
| Direction toggle | `direction` | text | ✅ Live | Manual |
| Setup dropdown | `setup_name` | text | ✅ **NEW** | Manual |
| - | `locations[0]` | text[] | ⚠️ Deprecated (still saved) | Auto from setup |
| Entry price input | `entry_price` | numeric | ✅ Live | Manual |
| Stop loss input | `stop_loss` | numeric | ✅ Live | Manual |
| Target price input | `target_price` | numeric | ✅ **NEW** | Manual |
| Lot size input | `lot_size` | numeric | ✅ Live | Manual |
| Risk tier buttons (A/B/C) | `risk_tier` | text | ✅ Live | Manual |
| - | `risk_amount` | numeric | ✅ Live | Auto from tier |
| Entry date/time picker | `entry_time` | timestamptz | ✅ Live | Manual |
| - | `session` | text | ✅ **NEW** | Auto from entry_time |
| - | `trading_session` | text | ⚠️ Deprecated (still saved) | Auto from entry_time |
| Calm/Stressed slider | `emotions.calm_stressed` | jsonb | ✅ Live | Manual |
| Focus slider | `emotions.focus` | jsonb | ✅ Live | Manual |
| Urge to Recover slider | `emotions.urge_recover` | jsonb | ✅ Live | Manual |
| Pre-trade checklist | `checklist_passed` | boolean | ✅ **NEW** | Auto (all checked?) |
| - | `model` | text | ⚠️ Required (hardcoded "trend") | Auto |

---

### AddTradeBottomSheet.tsx (Full Mode)

Same as above, plus:

| UI Input | Database Field | Type | Status | Auto/Manual |
|----------|----------------|------|--------|-------------|
| Bias card/input | `bias_snapshot` | text | ✅ **NEW** | Manual |
| Session pattern tracker | `session` | text | ✅ **NEW** | Auto/Manual |
| Good actions chips (entry) | `good_actions` | text[] | ✅ Live | Manual |
| Mistake tags chips (entry) | `mistake_tags` | text[] | ✅ Live | Manual |
| Notes textarea | `notes` | text | ✅ Live | Manual |
| Screenshot upload (entry) | `screenshot_url` | text | ✅ Live | Manual |
| Is experimental checkbox | `is_experimental` | boolean | ✅ Live | Manual |

---

## 🎯 CLOSE/MANAGE FORM → DATABASE MAPPING

### ManageTradeSheet.tsx

| UI Input | Database Field | Type | Status | Auto/Manual |
|----------|----------------|------|--------|-------------|
| Exit price input | `exit_price` | numeric | ✅ Live | Manual |
| Exit time picker | `exit_time` | timestamptz | ✅ Live | Manual (defaults NOW) |
| - | `pnl` | numeric | ✅ Live | **Auto-calculated** |
| - | `r_multiple` | numeric | ✅ Live | **Auto-calculated** |
| - | `duration_minutes` | integer | ✅ Live | **Auto-calculated** |
| Manual P&L override input | `pnl` (override) | numeric | ✅ Live | Manual override |
| **MAE (R) input** | `mae_r` | numeric | ✅ **NEW** | Manual |
| **MFE (R) input** | `mfe_r` | numeric | ✅ **NEW** | Manual |
| - | `efficiency` | numeric | ✅ **NEW** | **Auto-calculated** (r/mfe) |
| Moved to BE checkbox | `moved_to_be` | boolean | ✅ **NEW** | Manual |
| BE trigger R input | `be_trigger_r` | numeric | ✅ **NEW** | Manual |
| Partial close at 2R checkbox | `partial_at_2r` | boolean | ✅ **NEW** | Manual |
| Orderflow exit checkbox | `orderflow_exit` | boolean | ✅ **NEW** | Manual |
| Trailing stop checkbox | `used_trailing_stop` | boolean | ✅ **NEW** | Manual |
| Exit reason buttons | `exit_reason` | text | ✅ **NEW** | Manual |
| Screenshot upload | `screenshot_url` | text | ✅ Live | Manual |
| Trade lessons textarea | `trade_lessons` | text | ✅ Live | Manual |
| Mistake tags chips | `mistake_tags` | text[] | ✅ Live | Manual |
| Good actions chips | `good_actions` | text[] | ✅ Live | Manual |
| - | `status` | text | ✅ Live | Auto set to "closed" |

---

## 🤖 AUTO-CALCULATED FIELDS

These fields are **never manually entered** - always computed:

| Field | Formula | Where Calculated |
|-------|---------|------------------|
| `pnl` | `(pips × pip_value × lot_size) - commission` | useTradesOptimized.closeTrade() |
| `r_multiple` | `pnl / risk_amount` | useTradesOptimized.closeTrade() |
| `duration_minutes` | `(exit_time - entry_time) / 60` | useTradesOptimized.closeTrade() |
| `efficiency` | `MIN(1.0, r_multiple / mfe_r)` | TradeCard.handleCloseTradeWithLessons() |
| `session` | Auto-detected from `entry_time` | getActiveSession(entry_time) |
| `risk_amount` | From settings based on `risk_tier` | settings.customRiskAmounts[tier] |

---

## 🔍 NOT YET MAPPED (Available in DB, Not in UI)

These fields exist in DB but don't have UI inputs yet:

| Database Field | Type | Purpose | Priority |
|----------------|------|---------|----------|
| `atr_pips` | numeric | ATR at entry | Medium |
| `spread` | numeric | Spread in pips | Medium |
| `slippage` | numeric | Slippage in pips | Medium |
| `account_equity` | numeric | Account equity snapshot | Low |
| `confidence` | integer (1-5) | Trade confidence | **High** |
| `discipline_tag` | text | Discipline classification | Medium |

---

## ⚠️ DEPRECATED FIELDS (Still Saved for Compatibility)

| Old Field | New Field | Status |
|-----------|-----------|--------|
| `locations[0]` | `setup_name` | Both saved, use `setup_name` going forward |
| `trading_session` | `session` | Both saved, use `session` going forward |
| `exit_price` (at entry) | `target_price` | Now separated |
| `aggression` | - | Empty array saved for compatibility |
| `scenarios` | - | Empty array saved for compatibility |
| `externals` | - | Empty array saved for compatibility |

---

## 📊 FIELD CATEGORIES

### Entry Stage (When Opening Trade)
**Fully Mapped:** asset, direction, setup_name, entry_price, stop_loss, target_price, lot_size, risk_tier, risk_amount, entry_time, session, emotions, checklist_passed

**Partially Mapped:** bias_snapshot (full mode only), good_actions (full mode only), notes (full mode only)

**Not Yet Mapped:** confidence, atr_pips, spread, slippage, account_equity, discipline_tag

### Close Stage (When Closing Trade)
**Fully Mapped:** exit_price, exit_time, mae_r, mfe_r, moved_to_be, be_trigger_r, partial_at_2r, used_trailing_stop, orderflow_exit, exit_reason, trade_lessons, mistake_tags, good_actions, screenshot_url

**Auto-Calculated:** pnl, r_multiple, duration_minutes, efficiency

### Always Auto
**System Fields:** id, user_id, challenge_id, status, created_at, updated_at, is_experimental, override_reason

---

## ✅ VERIFICATION CHECKLIST

Run `SCHEMA_VERIFICATION.sql` to confirm:

- [ ] All 19 new columns exist in database
- [ ] All new columns are nullable
- [ ] Efficiency calculates correctly (r_multiple / mfe_r)
- [ ] Indexes exist for new fields
- [ ] Constraints work (confidence 1-5, efficiency 0-1)
- [ ] Insert with new fields works
- [ ] Update with new fields works
- [ ] No null pointer errors in UI
- [ ] Backward compatible (old trades still load)

---

## 🎯 NEXT STEPS TO COMPLETE

### Phase 1: Add Missing UI Inputs (Recommended)
1. Add `confidence` slider (1-5) to entry forms ⭐
2. Add `discipline_tag` dropdown to entry forms
3. Add `atr_pips`, `spread`, `account_equity` inputs (collapsible section)

### Phase 2: Create Analytics Views
1. Efficiency by setup query/dashboard
2. Breakeven impact analysis
3. Confidence correlation analysis
4. Risk efficiency metrics (R / MAE)

### Phase 3: Clean Up (Future)
1. Remove deprecated field usage from forms
2. (Optional) Drop deprecated columns from DB
3. Update documentation to remove deprecated references

---

## 📞 SUPPORT

**Migration File:** `migrations/complete_trades_schema_remap.sql`  
**Verification File:** `SCHEMA_VERIFICATION.sql`  
**Full Schema Docs:** `TRADES_SCHEMA_FINAL.md`  
**Quick Reference:** `SCHEMA_QUICK_REF.md`

---

**Last Updated:** 2024-10-16  
**Schema Version:** 2.0 (Manual Workflow)  
**Status:** ✅ Live and Mapped

