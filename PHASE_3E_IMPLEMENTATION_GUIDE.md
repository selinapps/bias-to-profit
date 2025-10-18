# Phase 3E: Market Context Intelligence - Implementation Complete

**This file contains ALL the code changes needed. I'll apply them systematically.**

---

## ✅ COMPLETED

1. ✅ Migration created (`migrations/phase3e_market_context_intelligence.sql`)
2. ✅ State variables added to SimplifiedAddTradeSheet
3. ✅ Reset function updated

---

## 🔄 REMAINING CHANGES

### **1. Add to tradeData in handleSubmit** (Line ~195)

Add after `discipline_tag`:

```typescript
// ✅ PHASE 3E: Market Context
htf_bias: htfBias || null,
htf_bias_tf: htfBiasTf || null,
vwap_type: vwapType || null,
vwap_band: vwapBand || null,
atr_tf: atrTf || null,
atr_period: atrPeriod || null,
atr_value_pips: atrValuePips ? parseFloat(atrValuePips) : null,
atr_units: atrUnits || null,
profile_scope: profileScope || null,
fva_position: fvaPosition || null,
poi_type: poiType || null,
poi_scope: poiScope || null,
// Auto-calculated fields (trigger will handle these)
bias_aligned: null, // Auto
vwap_side: null, // Auto
inside_value: null, // Auto
outside_value: null, // Auto
atr_bucket: null, // Future: can be calculated from historical ATR percentiles
```

---

### **2. Add UI Section** (After checklist, before Price Levels ~line 501)

```tsx
{/* ✅ PHASE 3E: Market Context (Collapsible) */}
<Card className="p-4 bg-gradient-to-br from-blue-950/20 to-purple-950/20 border-blue-500/30">
  <div className="flex items-center justify-between mb-4">
    <Label className="text-base font-semibold flex items-center gap-2">
      <BarChart3 className="h-4 w-4" />
      Market Context (Optional)
    </Label>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setShowEmotions(!showEmotions)}
      className="h-8"
    >
      {showEmotions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </Button>
  </div>

  {showEmotions && (
    <div className="space-y-4">
      {/* HTF Bias */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">HTF Bias</Label>
          <Select value={htfBias} onValueChange={setHtfBias}>
            <SelectTrigger className="h-10 bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bullish">📈 Bullish</SelectItem>
              <SelectItem value="Bearish">📉 Bearish</SelectItem>
              <SelectItem value="Neutral">➖ Neutral</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">HTF Timeframe</Label>
          <Select value={htfBiasTf} onValueChange={setHtfBiasTf}>
            <SelectTrigger className="h-10 bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="D1">D1</SelectItem>
              <SelectItem value="H4">H4</SelectItem>
              <SelectItem value="H1">H1</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* VWAP Context */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">VWAP Type</Label>
          <Select value={vwapType} onValueChange={setVwapType}>
            <SelectTrigger className="h-10 bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Session">Session</SelectItem>
              <SelectItem value="Day">Day</SelectItem>
              <SelectItem value="Week">Week</SelectItem>
              <SelectItem value="Anchored">Anchored</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">VWAP Band</Label>
          <Select value={vwapBand} onValueChange={setVwapBand}>
            <SelectTrigger className="h-10 bg-slate-900">
              <SelectValue placeholder="Select band..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Below −3σ">Below −3σ</SelectItem>
              <SelectItem value="−3σ to −2σ">−3σ to −2σ</SelectItem>
              <SelectItem value="−2σ to −1σ">−2σ to −1σ</SelectItem>
              <SelectItem value="−1σ to VWAP">−1σ to VWAP</SelectItem>
              <SelectItem value="At VWAP">At VWAP</SelectItem>
              <SelectItem value="VWAP to +1σ">VWAP to +1σ</SelectItem>
              <SelectItem value="+1σ to +2σ">+1σ to +2σ</SelectItem>
              <SelectItem value="+2σ to +3σ">+2σ to +3σ</SelectItem>
              <SelectItem value="Above +3σ">Above +3σ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ATR Context */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">ATR TF</Label>
          <Select value={atrTf} onValueChange={setAtrTf}>
            <SelectTrigger className="h-10 bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M1">M1</SelectItem>
              <SelectItem value="M5">M5</SelectItem>
              <SelectItem value="M15">M15</SelectItem>
              <SelectItem value="M30">M30</SelectItem>
              <SelectItem value="H1">H1</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">ATR Period</Label>
          <Select value={String(atrPeriod)} onValueChange={(v) => setAtrPeriod(Number(v))}>
            <SelectTrigger className="h-10 bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="7">7</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="14">14</SelectItem>
              <SelectItem value="20">20</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">ATR (pips)</Label>
          <Input
            type="number"
            step="0.1"
            value={atrValuePips}
            onChange={(e) => setAtrValuePips(e.target.value)}
            placeholder="e.g., 12.5"
            className="h-10 bg-slate-900"
          />
        </div>
      </div>

      {/* FVA Position */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Profile Scope</Label>
          <Select value={profileScope} onValueChange={setProfileScope}>
            <SelectTrigger className="h-10 bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Session">Session</SelectItem>
              <SelectItem value="Prior Day">Prior Day</SelectItem>
              <SelectItem value="Week">Week</SelectItem>
              <SelectItem value="Composite (N)">Composite (N)</SelectItem>
              <SelectItem value="Leg">Leg</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">FVA Position</Label>
          <Select value={fvaPosition} onValueChange={setFvaPosition}>
            <SelectTrigger className="h-10 bg-slate-900">
              <SelectValue placeholder="Select position..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Below VAL">Below VAL</SelectItem>
              <SelectItem value="VAL to POC">VAL to POC</SelectItem>
              <SelectItem value="At POC">At POC</SelectItem>
              <SelectItem value="POC to VAH">POC to VAH</SelectItem>
              <SelectItem value="Above VAH">Above VAH</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* POI Type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">POI Type</Label>
          <Select value={poiType} onValueChange={setPoiType}>
            <SelectTrigger className="h-10 bg-slate-900">
              <SelectValue placeholder="Select POI..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Volume/Profile</div>
              <SelectItem value="LVN">LVN</SelectItem>
              <SelectItem value="HVN">HVN</SelectItem>
              <SelectItem value="POC">POC</SelectItem>
              <SelectItem value="VAH">VAH</SelectItem>
              <SelectItem value="VAL">VAL</SelectItem>
              <SelectItem value="VWAP">VWAP</SelectItem>
              <SelectItem value="VWAP ±1σ">VWAP ±1σ</SelectItem>
              <SelectItem value="VWAP ±2σ">VWAP ±2σ</SelectItem>
              <SelectItem value="Composite LVN">Composite LVN</SelectItem>
              
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Session/Structure</div>
              <SelectItem value="Asia High">Asia High</SelectItem>
              <SelectItem value="Asia Low">Asia Low</SelectItem>
              <SelectItem value="IB High">IB High</SelectItem>
              <SelectItem value="IB Low">IB Low</SelectItem>
              <SelectItem value="NY Open">NY Open</SelectItem>
              <SelectItem value="London Open">London Open</SelectItem>
              <SelectItem value="Prev Day High">Prev Day High</SelectItem>
              <SelectItem value="Prev Day Low">Prev Day Low</SelectItem>
              <SelectItem value="Prev Close">Prev Close</SelectItem>
              <SelectItem value="Round Number (00)">Round Number (00)</SelectItem>
              <SelectItem value="Quarter Level (25/75)">Quarter Level (25/75)</SelectItem>
              
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Orderflow/Price Action</div>
              <SelectItem value="Order Block (Bull)">Order Block (Bull)</SelectItem>
              <SelectItem value="Order Block (Bear)">Order Block (Bear)</SelectItem>
              <SelectItem value="FVG">FVG</SelectItem>
              <SelectItem value="Breaker">Breaker</SelectItem>
              <SelectItem value="Mitigation Block">Mitigation Block</SelectItem>
              <SelectItem value="Balanced Price Range">Balanced Price Range</SelectItem>
              <SelectItem value="Liquidity Void">Liquidity Void</SelectItem>
              <SelectItem value="Trendline Liquidity">Trendline Liquidity</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">POI Scope</Label>
          <Select value={poiScope} onValueChange={setPoiScope}>
            <SelectTrigger className="h-10 bg-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Intra-day">Intra-day</SelectItem>
              <SelectItem value="Prior Day">Prior Day</SelectItem>
              <SelectItem value="Weekly">Weekly</SelectItem>
              <SelectItem value="Composite">Composite</SelectItem>
              <SelectItem value="Anchored Leg">Anchored Leg</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )}
</Card>
```

This section goes AFTER the checklist card and BEFORE "Price Levels".

**Applying this now...**

