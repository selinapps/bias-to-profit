# 📊 cTrader Import Guide

## Overview

Import your trading history directly from cTrader into the Bias to Profit app. This feature automatically maps your cTrader trades to the app's structure, allowing you to analyze your performance, track patterns, and improve your trading discipline.

## Features

✅ **CSV Import** - Import trades from cTrader CSV export  
✅ **Automatic Mapping** - Automatically maps cTrader fields to app structure  
✅ **Flexible Configuration** - Set model, risk tier, and risk amount for imports  
✅ **Preview & Select** - Review and select which trades to import  
✅ **Batch Import** - Import multiple trades at once  
✅ **Smart Validation** - Validates trade data before import  

## How to Export from cTrader

### Step 1: Access Trade History

1. Open **cTrader** platform
2. Go to **History** tab
3. Select the date range for trades you want to export
4. Right-click in the history area

### Step 2: Export to CSV

1. Select **"Export"** or **"Export to CSV"**
2. Choose a location to save the file
3. Name it something memorable (e.g., `ctrader-jan-2024.csv`)
4. Save the file

### Expected CSV Format

cTrader typically exports with these columns:
- **Trade ID** / Position ID
- **Symbol** (e.g., EURUSD, GBPUSD)
- **Direction** (Buy/Sell or Long/Short)
- **Volume** / Lot Size
- **Entry Price** / Open Price
- **Exit Price** / Close Price
- **Entry Time** / Open Time
- **Exit Time** / Close Time
- **Gross Profit**
- **Commission**
- **Swap**
- **Net Profit** / P&L
- **Stop Loss** (optional)
- **Take Profit** (optional)

## How to Import into Bias to Profit

### Step 1: Open Import Modal

1. Navigate to **Trades** tab in the app
2. Click **"Import from cTrader"** button (top right)
3. The import modal will open

### Step 2: Upload CSV File

1. Click **"Select File"** or drag and drop your CSV
2. Wait for the file to be parsed
3. Review the number of trades found

💡 **Tip**: Click **"Download Sample Format"** to see an example CSV structure

### Step 3: Configure Default Mappings

Before importing, set default values for required fields:

**Default Model**
- Choose `Trend` or `Mean Reversion`
- This determines the trading model category

**Default Risk Tier**
- Choose `A`, `B`, or `C`
- Matches your app's risk tier system

**Default Risk Amount**
- Enter your standard risk amount (e.g., `100`)
- This will be used for all imported trades

💡 **Tip**: Click **"Apply to All Trades"** to update all trades with these defaults

### Step 4: Review & Customize Individual Trades

Each trade preview shows:
- **Direction badge** (Long/Short)
- **Symbol** and **Volume**
- **Entry date**
- **Net P&L** (if available)
- **Entry/Exit/Stop Loss prices**

For each trade, you can customize:
- ✅ **Select/Deselect** - Toggle import checkbox
- 📊 **Model** - Trend or Mean Reversion
- 🎯 **Risk Tier** - A, B, or C
- 💰 **Risk Amount** - Dollar amount

### Step 5: Import Selected Trades

1. Review the **selected count** at bottom
2. Click **"Import X Trades"** button
3. Wait for import to complete
4. Review import statistics:
   - ✅ Successfully imported
   - ❌ Failed (if any)

### Step 6: Verify Imported Trades

1. Close the import modal
2. Check the **Trades** tab
3. Your imported trades should now appear
4. Review imported trades for accuracy

## Field Mapping Reference

| cTrader Field | App Field | Notes |
|--------------|-----------|-------|
| Symbol | asset | Cleaned (e.g., EURUSD) |
| Direction (Buy/Sell) | direction (long/short) | Automatically converted |
| Volume | lot_size | Decimal value |
| Entry Price | entry_price | 4-5 decimal places |
| Exit Price | exit_price | Null if trade still open |
| Entry Time | entry_time | ISO 8601 format |
| Exit Time | exit_time | ISO 8601 format, null if open |
| Net Profit | pnl | Calculated from gross - commission - swap |
| Stop Loss | stop_loss | Estimated if not provided |
| - | model | User-selected (trend/mean_reversion) |
| - | risk_tier | User-selected (a/b/c) |
| - | risk_amount | User-selected dollar amount |
| - | status | Auto: 'closed' if exit time exists |
| Trade ID | notes | Stored in notes field |

## Supported Date Formats

The parser automatically handles these formats:
- ISO 8601: `2024-01-15T09:30:00Z`
- European: `15.01.2024 09:30:00`
- US Format: `01/15/2024 09:30:00`
- Most common date/time combinations

## Tips & Best Practices

### 📅 Import Frequency
- Import trades **weekly** or **monthly**
- Don't import the same trades twice (duplicates not auto-detected)
- Keep your CSV exports organized by date range

### 🎯 Accuracy
- **Review all trades** before importing
- **Verify P&L** matches your broker records
- **Check date/times** are in correct timezone

### 📊 Categorization
- Be **consistent** with model assignments
- Use **risk tiers** that match your strategy
- **Tag trades** after import for better analysis

### 🔍 Troubleshooting
- **No trades found**: Check CSV format matches expected structure
- **Parse errors**: Ensure no special characters in CSV
- **Import failed**: Verify required fields (asset, direction, prices)
- **Wrong dates**: Check timezone in your cTrader export

## Advanced Features

### Stop Loss Estimation
If your CSV doesn't include stop loss:
- System estimates SL at **1% from entry**
- Long trades: SL = Entry × 0.99
- Short trades: SL = Entry × 1.01
- **Recommendation**: Edit trades after import to set accurate SL

### Net Profit Calculation
If Net Profit is missing but you have:
- Gross Profit
- Commission
- Swap

The system calculates: `Net Profit = Gross Profit - Commission - Swap`

### Batch Editing
After import, you can:
1. Filter imported trades by date
2. Bulk update tags or categories
3. Add notes or lessons learned
4. Attach screenshots retroactively

## Sample Import Workflow

```
1. Export last week's trades from cTrader
   └─> Save as: ctrader-week-03.csv

2. Open Bias to Profit → Trades tab
   └─> Click "Import from cTrader"

3. Upload ctrader-week-03.csv
   └─> 15 trades found

4. Set defaults:
   └─> Model: Trend
   └─> Risk Tier: B
   └─> Risk Amount: $100

5. Review trades:
   └─> Deselect 2 demo trades
   └─> Customize 1 trade to Mean Reversion

6. Import 13 selected trades
   └─> ✅ 13 successful

7. Review in trades list
   └─> Add tags and notes as needed
```

## Troubleshooting

### Issue: "CSV file doesn't contain any valid trades"

**Causes:**
- CSV format not recognized
- Missing required columns
- Empty file

**Solutions:**
1. Download the **sample format** from the import modal
2. Compare your CSV structure to the sample
3. Ensure headers match expected names
4. Check for at least: Symbol, Direction, Entry Price, Volume

### Issue: "Failed to parse the CSV file"

**Causes:**
- Special characters in file
- Encoding issues
- Corrupted file

**Solutions:**
1. Open CSV in text editor, save as UTF-8
2. Remove any special formatting
3. Re-export from cTrader

### Issue: Some trades failed to import

**Causes:**
- Missing required data
- Invalid price values
- Date format issues

**Solutions:**
1. Check the import statistics
2. Review failed trades in console (F12)
3. Manually add problematic trades

## Privacy & Data

- ✅ All data stays in **your Supabase database**
- ✅ CSV parsing happens **client-side** (in browser)
- ✅ No data sent to third-party servers
- ✅ Your cTrader login is **never required**

## Limitations

- **No duplicate detection**: Same trade can be imported multiple times
- **Manual categorization**: Model and risk tier must be set manually
- **No automatic tags**: Psychology tags, scenarios need manual entry
- **Screenshots**: Must be uploaded separately per trade
- **No broker sync**: One-time import only, not live sync

## Future Enhancements

🔮 Planned features:
- Auto-detect duplicate trades
- Support for MT4/MT5 exports
- Automatic timezone conversion
- Bulk screenshot upload
- Recurring auto-import
- Direct broker API integration

## Support

### Need Help?
- Check the **sample CSV format** in the import modal
- Review this guide's **Field Mapping Reference**
- Test with a **small CSV** (2-3 trades) first

### Feature Requests
If you need support for a different CSV format or broker, please let us know!

---

**Happy Trading! 📈**

Remember: The goal is to import your history so you can analyze patterns, learn from mistakes, and improve your trading discipline. Take time to review and categorize your trades properly after import.

