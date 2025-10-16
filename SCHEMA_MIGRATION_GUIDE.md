# 🚀 Schema Migration Implementation Guide

## Step 1: Apply Database Migration

### Option A: Via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `migrations/complete_trades_schema_remap.sql`
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**
7. Verify success (should see "Success. No rows returned")

### Option B: Via Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

---

## Step 2: Verify Migration

Run this query in SQL Editor to confirm all new fields exist:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trades' 
  AND table_schema = 'public'
  AND column_name IN (
    'setup_name', 'target_price', 'session', 
    'mae_r', 'mfe_r', 'efficiency',
    'moved_to_be', 'be_trigger_r', 'exit_reason'
  )
ORDER BY column_name;
```

**Expected Result:** Should return 9 rows showing the new fields.

---

## Step 3: Update Your Code

### 3.1: Import Fresh Types

The TypeScript types have been updated in:
```
src/integrations/supabase/types.ts
```

**No code changes needed** - your IDE will now recognize all new fields.

### 3.2: Update Entry Forms

**SimplifiedAddTradeSheet.tsx** - Add these fields to `handleSubmit`:

```typescript
const tradeData: any = {
  asset,
  model: 'trend', // Still required
  direction,
  setup_name: currentSetup?.name || null,  // ✅ NEW (was locations[0])
  session: sessionAtEntry?.name || null,    // ✅ NEW (was trading_session)
  target_price: parseFloat(target) || null, // ✅ NEW (separate from exit_price)
  risk_tier: riskTier,
  risk_amount: riskAmount,
  entry_price: parseFloat(entryPrice),
  stop_loss: parseFloat(stopLoss),
  entry_time: entryTime.toISOString(),
  
  // Optional manual context fields
  confidence: confidence || null,           // ✅ NEW (if you add confidence input)
  bias_snapshot: biasText || null,          // ✅ NEW (if you add bias input)
  checklist_passed: checklistComplete,      // ✅ NEW
  emotions: emotions,
  notes: notes || null,
  lot_size: parseFloat(lotSize) || 1.0,
  
  // Keep for backward compatibility
  locations: [currentSetup?.name || 'Custom'], // DEPRECATED but keep
  trading_session: sessionAtEntry?.name || null, // DEPRECATED but keep
};
```

### 3.3: Update Manage/Close Forms

**ManageTradeSheet.tsx** - Add these fields to close trade:

```typescript
await onCloseTrade(
  trade.id, 
  parseFloat(exitPrice),
  lessons,
  selectedMistakes,
  selectedGoodActions,
  screenshotUrl,
  exitTime || undefined,
  useManualPnL ? parseFloat(manualPnL) || undefined : undefined,
  {
    // ✅ Trade management data (NOW SAVED!)
    moved_to_be: tradeManagement.movedToBreakeven,
    be_trigger_r: tradeManagement.movedToBEAtR || null,
    partial_at_2r: tradeManagement.partialCloseAt2R,
    used_trailing_stop: tradeManagement.trailingStopUsed,
    orderflow_exit: tradeManagement.orderflowBasedExit,
    exit_reason: tradeManagement.finalExitReason,
    
    // ✅ MAE/MFE (add inputs for these)
    mae_r: parseFloat(maeInput) || null,
    mfe_r: parseFloat(mfeInput) || null,
  }
);
```

---

## Step 4: Add New UI Inputs (Optional but Recommended)

### Entry Screen - Add These Inputs:

#### 4.1: Confidence Slider (1-5)
```tsx
<div className="space-y-2">
  <Label>Trade Confidence (1-5)</Label>
  <Slider
    value={[confidence]}
    onValueChange={([value]) => setConfidence(value)}
    min={1}
    max={5}
    step={1}
  />
  <div className="text-xs text-center">{confidence}/5</div>
</div>
```

#### 4.2: Bias Snapshot Input
```tsx
<div className="space-y-2">
  <Label>Bias Snapshot</Label>
  <Input
    placeholder="e.g., Bearish D1 → Bullish M15 Reversal"
    value={biasSnapshot}
    onChange={(e) => setBiasSnapshot(e.target.value)}
  />
</div>
```

#### 4.3: Manual Context Inputs (Collapsible Section)
```tsx
<div className="space-y-3">
  <Label>Market Context (Optional)</Label>
  <div className="grid grid-cols-2 gap-3">
    <Input
      type="number"
      placeholder="ATR (pips)"
      value={atrPips}
      onChange={(e) => setAtrPips(e.target.value)}
    />
    <Input
      type="number"
      placeholder="Spread (pips)"
      value={spread}
      onChange={(e) => setSpread(e.target.value)}
    />
    <Input
      type="number"
      placeholder="Account Equity"
      value={accountEquity}
      onChange={(e) => setAccountEquity(e.target.value)}
    />
  </div>
</div>
```

### Close/Manage Screen - Add These Inputs:

#### 4.4: MAE/MFE Inputs
```tsx
<div className="grid grid-cols-2 gap-3">
  <div>
    <Label>MAE (R)</Label>
    <Input
      type="number"
      step="0.01"
      placeholder="e.g., -0.35"
      value={maeR}
      onChange={(e) => setMaeR(e.target.value)}
    />
    <p className="text-xs text-muted-foreground">Max drawdown in R</p>
  </div>
  <div>
    <Label>MFE (R)</Label>
    <Input
      type="number"
      step="0.01"
      placeholder="e.g., 2.8"
      value={mfeR}
      onChange={(e) => setMfeR(e.target.value)}
    />
    <p className="text-xs text-muted-foreground">Max profit in R</p>
  </div>
</div>
```

---

## Step 5: Update Close Trade Handler

In `useTradesOptimized.tsx`, update the `closeTrade` function:

```typescript
const closeTrade = useCallback(async (
  id: string, 
  exitPrice: number, 
  exitTime?: Date,
  tradeManagement?: {
    moved_to_be?: boolean;
    be_trigger_r?: number;
    partial_at_2r?: boolean;
    used_trailing_stop?: boolean;
    orderflow_exit?: boolean;
    exit_reason?: string;
    mae_r?: number;
    mfe_r?: number;
  }
) => {
  const trade = trades.find(t => t.id === id);
  if (!trade) throw new Error('Trade not found');

  // ... existing P&L calculations ...

  // Calculate efficiency if MFE provided
  let efficiency = null;
  if (tradeManagement?.mfe_r && tradeManagement.mfe_r > 0) {
    efficiency = Math.min(1.0, rMultiple / tradeManagement.mfe_r);
  }

  const { error } = await supabase
    .from('trades')
    .update({
      status: 'closed',
      exit_price: exitPrice,
      exit_time: exitTimeToUse.toISOString(),
      pnl: Number(pnl.toFixed(2)),
      r_multiple: Number(rMultiple.toFixed(3)),
      duration_minutes: durationMinutes,
      
      // ✅ NEW FIELDS
      mae_r: tradeManagement?.mae_r || null,
      mfe_r: tradeManagement?.mfe_r || null,
      efficiency: efficiency,
      moved_to_be: tradeManagement?.moved_to_be || false,
      be_trigger_r: tradeManagement?.be_trigger_r || null,
      partial_at_2r: tradeManagement?.partial_at_2r || false,
      used_trailing_stop: tradeManagement?.used_trailing_stop || false,
      orderflow_exit: tradeManagement?.orderflow_exit || false,
      exit_reason: tradeManagement?.exit_reason || null,
    })
    .eq('id', id);

  if (error) throw error;
}, [trades, supabase]);
```

---

## Step 6: Test the Migration

### 6.1: Test Entry
1. Open your app
2. Click "Add Trade"
3. Fill in a test trade with:
   - Basic fields (asset, direction, prices)
   - New fields (confidence, bias snapshot)
4. Submit
5. Check database to confirm `setup_name` and `session` are populated

### 6.2: Test Close
1. Open the test trade
2. Add exit price
3. Fill in MAE/MFE
4. Check trade management flags
5. Close trade
6. Verify all new fields saved

### 6.3: Verify Query
```sql
SELECT 
  id,
  setup_name,
  session,
  target_price,
  mae_r,
  mfe_r,
  efficiency,
  exit_reason,
  moved_to_be
FROM trades
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 5;
```

---

## Step 7: Analytics Queries Ready to Use

Now you can run advanced analytics:

### Efficiency by Setup
```sql
SELECT 
  setup_name,
  COUNT(*) as trades,
  AVG(efficiency) as avg_efficiency,
  AVG(r_multiple) as avg_r
FROM trades
WHERE status = 'closed' 
  AND efficiency IS NOT NULL
GROUP BY setup_name
ORDER BY avg_efficiency DESC;
```

### Risk Efficiency (R captured vs MAE)
```sql
SELECT 
  AVG(ABS(r_multiple / NULLIF(mae_r, 0))) as risk_efficiency,
  COUNT(*) as trade_count
FROM trades
WHERE mae_r IS NOT NULL AND mae_r != 0;
```

### Breakeven Impact
```sql
SELECT 
  moved_to_be,
  COUNT(*) as trades,
  AVG(r_multiple) as avg_r,
  AVG(efficiency) as avg_efficiency
FROM trades
WHERE status = 'closed'
GROUP BY moved_to_be;
```

---

## 📋 Checklist

- [ ] Migration SQL executed successfully
- [ ] Verified new columns exist in database
- [ ] TypeScript types updated (already done)
- [ ] Entry form updated to use `setup_name` and `session`
- [ ] Close form updated to save trade management data
- [ ] Added UI inputs for confidence, bias, MAE/MFE (optional)
- [ ] Tested adding a new trade
- [ ] Tested closing a trade with new fields
- [ ] Ran test analytics queries
- [ ] Verified no crashes from null values

---

## 🆘 Troubleshooting

### Error: "column does not exist"
**Solution:** Migration didn't run. Go back to Step 1.

### Error: "null value in column violates not-null constraint"
**Solution:** You're missing a required field. Check that `model` is set to "trend".

### TypeScript errors after migration
**Solution:** Restart your dev server and TypeScript server.

### Old trades showing NULL in new fields
**Expected behavior.** Old trades won't have new field data. Only new trades will populate them.

---

## 🎯 Next Steps After Migration

1. **Update UI Forms** - Add inputs for new fields gradually
2. **Build Analytics Dashboard** - Use new fields for deeper insights
3. **Create Efficiency Reports** - Track MAE/MFE and efficiency metrics
4. **Setup Analysis** - Compare setups using `setup_name` field
5. **Discipline Tracking** - Use `discipline_tag` and `checklist_passed`

---

**Migration Complete! 🎉**

Your schema is now stable, typed, and ready for manual analytics workflow.

