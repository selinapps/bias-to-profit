# 🚀 cTrader Import - Quick Start

## In 60 Seconds

### Export from cTrader
1. **History tab** → Right-click → **Export to CSV**
2. Save the file

### Import to App
1. **Trades tab** → **Import from cTrader** button
2. **Select your CSV file**
3. Set **Model**, **Risk Tier**, **Risk Amount**
4. Click **Import X Trades**
5. Done! ✅

## What Gets Imported

From cTrader CSV:
- Symbol (EURUSD, etc.)
- Buy/Sell → Long/Short
- Entry/Exit Prices
- Entry/Exit Times
- Lot Size
- P&L
- Stop Loss

You Add:
- Trading Model (Trend/Mean Reversion)
- Risk Tier (A/B/C)
- Risk Amount ($)

## Visual Guide

```
cTrader History
      ↓ [Export CSV]
Your Computer
      ↓ [Upload]
App → Trades Tab → Import Button
      ↓ [Configure & Review]
Imported Trades ✅
```

## Sample CSV

Download sample from the import modal or use this format:

```csv
Trade ID,Symbol,Direction,Volume,Entry Price,Exit Price,Entry Time,Exit Time,Net Profit,Stop Loss
12345,EURUSD,Buy,1.0,1.09500,1.09650,2024-01-15 09:30:00,2024-01-15 12:45:00,140.50,1.09200
```

## Pro Tips

✅ **Test first** - Import 2-3 trades to verify format  
✅ **Weekly imports** - Don't let trades pile up  
✅ **Review before import** - Deselect demo/test trades  
✅ **Add notes after** - Tag mistakes, emotions, lessons  

## Need More Help?

See **CTRADER_IMPORT_GUIDE.md** for full documentation.

---

**Ready? Let's import your trades! 📊**

