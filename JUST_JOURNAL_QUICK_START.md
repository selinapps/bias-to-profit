# ⚡ Just Journal - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Run Database Migrations (One-Time Setup)

Go to **Supabase Dashboard** → **SQL Editor** → Run these 2 queries:

```sql
-- Migration 1: User Settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS journal_mode TEXT DEFAULT 'advanced' CHECK (journal_mode IN ('advanced', 'simple'));
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS custom_setups JSONB DEFAULT '[{"id": "setup-1", "name": "Breakout", "description": "Momentum breakout setup", "checklist": ["Confirmed breakout", "Volume spike", "Clean structure"]}, {"id": "setup-2", "name": "Reversal", "description": "Counter-trend reversal", "checklist": ["Divergence present", "Support/resistance hit", "Reversal candle"]}]'::jsonb;

-- Migration 2: Trades Table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS bias_snapshot JSONB;
```

### Step 2: Switch to Just Journal Mode

1. Open your app
2. Click **Settings** (top right)
3. Go to **UI Preferences** tab
4. Click the **"Just Journal"** card (green/emerald)
5. Close settings

### Step 3: Log Your First Trade

1. Click **"Add Trade"** button
2. Fill in the form:
   - **Time & Session**: Auto-detects ICT session (adjust if needed)
   - **Asset**: Choose your pair
   - **Direction**: Long or Short
   - **Setup**: Select from your setups
   - **Prices**: Entry, SL, Target
   - **Size**: Lot size
3. **Complete checklist** (setup-specific)
4. Click **"Log Trade"**
5. **Done!** Trade logged in 30-60 seconds

## 📝 Trade Entry Form Layout

```
┌─────────────────────────────────────────────────┐
│ ⚡ Quick Trade Entry                             │
├─────────────────────────────────────────────────┤
│                                                  │
│ 🕐 Entry Time & Session                         │
│ ┌─────────────────────────────────────────────┐│
│ │ Date: 2025-10-15    Time: 10:30            ││
│ │ 🟢 Silver Bullet Hour                       ││
│ │ [Now] [-5min] [-15min]                      ││
│ └─────────────────────────────────────────────┘│
│                                                  │
│ Asset: EURUSD        Direction: [Long] Short    │
│ Setup: Reversal                                  │
│                                                  │
│ ✅ Setup Checklist (3/3)                        │
│ ☑️ Divergence present                           │
│ ☑️ Support/resistance hit                       │
│ ☑️ Reversal candle                              │
│                                                  │
│ Entry: 1.1000  SL: 1.0950  Target: 1.1050      │
│ Size: 1.00     Risk: $100                       │
│                                                  │
│ 📊 Calculations                                  │
│ 2.00R | $100.00 | 10.0 pips                    │
│ ICT Session: Silver Bullet Hour                 │
│ Local: 10:30:45  EST: 10:30:45  Tuesday        │
│                                                  │
│ [Log Trade]                                      │
└─────────────────────────────────────────────────┘
```

## 🎯 What Gets Tracked

### For Every Trade:
- ✅ **Entry timestamp** (with timezone)
- ✅ **ICT session** (Asian, London, NY, etc.)
- ✅ **Local time** (your timezone)
- ✅ **EST time** (New York time)
- ✅ **Day of week** (Monday-Friday)
- ✅ **Hour of day** (0-23)
- ✅ **Setup used** (stored in notes)
- ✅ **All price levels** (entry, SL, target)
- ✅ **Position size** (lot size)
- ✅ **Risk metrics** (R-multiple, pips, profit)

## 📊 Analysis You Can Do

### After 20-30 Trades:

**Best Session Analysis:**
```
Your win rate by ICT session:
- Silver Bullet Hour: 70%
- London Killzone: 65%
- London-NY Overlap: 60%
- Asian Range: 45%

👉 Conclusion: Focus on Silver Bullet & London Killzone
```

**Best Time Analysis:**
```
Your performance by hour (EST):
- 10:00-11:00: 2.1R average (Silver Bullet)
- 03:00-04:00: 1.8R average (London AM)
- 20:00-21:00: 0.9R average (Asian)

👉 Conclusion: Avoid Asian session, trade morning killzones
```

**Best Day Analysis:**
```
Your performance by day:
- Tuesday: $520 avg profit, 68% win rate
- Wednesday: $410 avg profit, 62% win rate
- Friday: $180 avg profit, 48% win rate

👉 Conclusion: Tuesday/Wednesday are your power days
```

## 🎨 Manage Your Setups

### Create Custom Setups

1. Click **"Manage Setups"** in trade entry
2. Click **"Create New Setup"**
3. Enter:
   - **Name**: "Liquidity Sweep"
   - **Description**: "Asian high/low sweep in London"
   - **Checklist**:
     - "Swept Asia high/low"
     - "Displacement away from sweep"
     - "FVG formed"
4. Click **"Create Setup"**
5. Use it in your next trade!

### Edit Existing Setups

1. Click **edit icon** (✏️) on any setup
2. Modify name, description, or checklist
3. Click **"Update Setup"**

### Example Setups to Create

**For ICT Trading:**
- **London Open Sweep** - Sweep Asia lows, reverse higher
- **NY Reversal** - Fade PM session extremes
- **Killzone Breakout** - First displacement in killzone
- **Silver Bullet Fade** - Counter-trend in SB hour
- **FVG Retest** - Price returns to fill gap

## 📈 Best Practices

### 1. **Log Immediately After Entry**
- Use "Now" button for instant logging
- Or use "-5min" if you forgot to log
- Accurate times = better analysis

### 2. **Be Consistent with Setups**
- Use same setup names for similar patterns
- Don't create too many setups (5-8 is ideal)
- Update checklists as you refine your process

### 3. **Review Weekly**
- Look at session performance
- Identify patterns
- Adjust trading schedule
- Focus on your best times

### 4. **Trust the Data**
- 30+ trades = meaningful patterns
- 50+ trades = strong conclusions
- 100+ trades = complete picture

## 🔧 Pro Tips

### Time Tracking
- **Always use local time** for logging
- **EST conversion happens automatically**
- **Session auto-detects** based on EST time

### Session-Based Trading
- **London Killzone**: Best for breakouts
- **Silver Bullet**: Best for reversals
- **Overlap**: Best for continuations
- **Asian**: Best to avoid (for most)

### Analysis Workflow
1. **Week 1-2**: Log all trades, all sessions
2. **Week 3**: Review session performance
3. **Week 4+**: Focus on best sessions only
4. **Monthly**: Refine based on data

## 🎯 Your Edge Formula

```
Best Session + Best Setup + Best Day = Maximum Edge
```

Example:
```
Tuesday + Silver Bullet Hour + Reversal Setup
= 75% win rate, 2.3R average
```

## ✨ Summary

Just Journal mode gives you:
- ⚡ **Speed**: Log trades in 30 seconds
- 🎯 **Precision**: Exact time & session tracking
- 📊 **Analysis**: Data for finding your edge
- 🔧 **Flexibility**: Custom setups & checklists
- 📈 **Growth**: Optimize based on YOUR data

**Start logging trades and let the data show you YOUR best trading times!** 🚀

---

## 🆘 Need Help?

See these guides:
- `JOURNAL_MODES_GUIDE.md` - Full feature guide
- `ICT_SESSION_TRACKING_GUIDE.md` - Session analysis details
- `MIGRATION_GUIDE.md` - Database setup
- `VISUAL_FLOW_GUIDE.md` - UI flow diagrams

**Questions?** Check the guides or ask for help!

