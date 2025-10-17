# Phase 3 MVP: Quick Start Guide

**Version:** v2.4.0  
**Time to Test:** 10 minutes  
**What You Get:** Intelligent recommendations to improve your trading

---

## 🚀 5-MINUTE SETUP

### **Step 1: Apply Migration (2 minutes)**

1. Open **Supabase Dashboard** → SQL Editor
2. Copy paste contents of: `migrations/phase3_recommendations_mvp.sql`
3. Click **"Run"**
4. Expected: `Success. No rows returned.`

**Verify:**
```sql
-- Should return: 1 (table exists)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name = 'recommendations';

-- Should return: 4 (functions exist)
SELECT COUNT(*) FROM pg_proc 
WHERE proname IN ('get_fomo_cost_analysis', 'get_continuation_opportunities', 
                  'get_confidence_calibration', 'generate_recommendations');
```

---

### **Step 2: Deploy Frontend (2 minutes)**

```bash
# Pull latest
cd /Users/mac/Downloads/xyz/bias-to-profit-main
git pull origin main
git checkout v2.4.0

# Already built! Just deploy
# Deploy dist/ folder to your hosting
```

---

### **Step 3: Generate Recommendations (1 minute)**

**Option A: Via UI** ⭐ Easiest
1. Open app → **Analytics** tab
2. Click **"Recommendations"** tab (purple Sparkles icon, 11th tab)
3. Click **"Generate"** button
4. Wait 2-5 seconds
5. Recommendations appear!

**Option B: Via SQL**
```sql
SELECT generate_recommendations(auth.uid());
-- Returns: number of recommendations created
```

---

### **Step 4: Review & Act (5 minutes)**

Click through the 4 tabs:

**1. Critical Tab** 🚨
- High-cost patterns (FOMO, revenge trading)
- Immediate action needed
- Expected: 0-2 recommendations

**2. High Priority Tab** ⚡
- Significant opportunities (hold longer, etc.)
- Implement this week
- Expected: 1-3 recommendations

**3. Insights Tab** 💡
- Optimization ideas (confidence calibration)
- Implement when ready
- Expected: 2-5 recommendations

**4. Implemented Tab** ✅
- Track what you've changed
- Monitor results
- Expected: 0 (nothing implemented yet)

---

## 📊 SAMPLE RECOMMENDATION

```
🎯 HIGH PRIORITY

Breakout Setup: Hold Longer for +7.5R
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Breakout trades continue 75% of the time after hitting target,
moving an average of 2.0R more. Based on 20 recent trades, holding
50% of your position could improve results by approximately 7.5R.

✅ Recommended Action:
When Breakout trade hits target: Close 50%, hold 50% with 1 ATR
trailing stop. Track results separately to verify improvement.

[Trade Management] [+7.5R]

┌───────────────────────────┐
│ ✓ Mark as Implemented      │
└───────────────────────────┘
```

---

## ⚠️ IF NO RECOMMENDATIONS APPEAR

**Need minimum data:**
- FOMO detector: 5+ trades with discipline_tag
- Continuation detector: 3+ post_trade_observations per setup
- Confidence detector: 3+ trades per confidence level

**Quick fix:**

Run test data script from `PHASE_2C_ACCEPTANCE_TESTS.md`:

```sql
-- Add 5 trades with discipline tags, confidence, MAE/MFE
-- Add 5 post-trade observations
-- Then: SELECT generate_recommendations(auth.uid());
```

---

## 🎯 WHAT TO DO WITH RECOMMENDATIONS

### **For Each Recommendation:**

1. **Read carefully** → Understand the pattern
2. **Review evidence** → Click "View supporting data"
3. **Decide:**
   - ✅ **Implement** → Click "Mark as Implemented"
   - ✗ **Dismiss** → Click "Dismiss" (not relevant)

4. **Track results:**
   - Monitor performance next 30 days
   - Verify if recommendation actually improved results
   - Adjust strategy accordingly

---

## 💡 EXAMPLE USE CASE

**Scenario:** You get this recommendation:

```
🚨 CRITICAL: FOMO Trades Cost You 4.2R

Last 60 days: 8 FOMO trades = -4.2R loss
Your "Followed Plan" trades = +18.5R

Action: Use pre-trade checklist ALWAYS
Expected: +4.2R/month improvement
```

**What to do:**

1. **Click "Mark as Implemented"** ✅
2. **Create pre-trade checklist** (write it down)
3. **Use checklist for next 30 days** on EVERY trade
4. **After 30 days, review:**
   - Did FOMO trades decrease?
   - Did your R-Multiple improve?
   - Did you gain the expected +4.2R?

5. **If yes:** Keep the habit! ✅
6. **If no:** Reassess the recommendation

---

## 🔄 REGENERATE RECOMMENDATIONS

**When to regenerate:**
- After 30 days (recommendations expire)
- After implementing changes (get new insights)
- After adding significant new data (20+ trades)

**How:**
Just click the **"Generate"** button again in the Recommendations tab!

---

## 📞 SUPPORT

**Common issues:**

1. **"No recommendations generated"**
   → Need more data (15-20 trades minimum)
   → Use test data scripts

2. **"Recommendations seem wrong"**
   → Check evidence JSON
   → May need more data for statistical significance

3. **"Can't find Recommendations tab"**
   → Pull latest code (v2.4.0)
   → Rebuild and deploy
   → Hard refresh browser

---

## ✅ SUCCESS CHECKLIST

- [ ] Migration applied (`phase3_recommendations_mvp.sql`)
- [ ] Frontend deployed (v2.4.0)
- [ ] 11 tabs visible in Analytics (including Recommendations)
- [ ] "Generate" button works
- [ ] At least 1 recommendation appears
- [ ] "Mark as Implemented" button works
- [ ] "Dismiss" button works
- [ ] No console errors

---

## 🎉 YOU'RE READY!

**Your trading journal is now an AI-powered coach!**

From data → patterns → recommendations → action → improvement! 🚀

**Next:** Implement your top 3 recommendations and track results!

