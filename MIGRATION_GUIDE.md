# 🔧 Database Migration Guide - Required Columns

## ⚠️ Important: Run These Migrations First!

Before using the new two-tier journal system, you need to add new columns to your Supabase database.

## 📋 Quick Steps

### Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase project**
   - Visit: https://supabase.com/dashboard
   - Select your project: `bias-to-profit`

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run Migration #1: User Settings Columns**
   - Open the file: `add_journal_mode_columns.sql`
   - Copy ALL the SQL code
   - Paste it into the SQL Editor
   - Click "Run" or press `Cmd/Ctrl + Enter`
   - Wait for success message

4. **Run Migration #2: Trades Table Column**
   - Click "New Query" again
   - Open the file: `add_bias_snapshot_column.sql`
   - Copy ALL the SQL code
   - Paste it into the SQL Editor
   - Click "Run" or press `Cmd/Ctrl + Enter`
   - Wait for success message

5. **Verify the columns were added**
   - Look for verification tables showing:
     - `journal_mode` (text) in user_settings
     - `custom_setups` (jsonb) in user_settings
     - `bias_snapshot` (jsonb) in trades

### Option 2: Command Line (Alternative)

If you have the Supabase CLI installed:

```bash
# From your project directory
supabase db push < add_journal_mode_columns.sql
```

## ✅ What These Migrations Do

### Migration #1: User Settings (add_journal_mode_columns.sql)

1. **Adds `journal_mode` column to user_settings**
   - Type: TEXT
   - Default: 'advanced'
   - Values: 'advanced' or 'simple'

2. **Adds `custom_setups` column to user_settings**
   - Type: JSONB (flexible JSON storage)
   - Default: 2 starter setups (Breakout and Reversal)
   - Stores array of setup objects

3. **Updates existing users**
   - Gives all existing users the default values
   - No data loss!

### Migration #2: Trades Table (add_bias_snapshot_column.sql)

1. **Adds `bias_snapshot` column to trades**
   - Type: JSONB
   - Nullable: Yes
   - Stores bias state context at trade entry time

## 🎯 After Migration

Once the migration is complete:

1. **Refresh your app** (`Cmd/Ctrl + Shift + R`)
2. **Go to Settings → UI Preferences**
3. **You'll see the Journal Mode selector!**
4. **Switch between Advanced and Just Journal modes**

## 🐛 Troubleshooting

### Error: "Column already exists"
- This is fine! It means the migration ran before
- The script uses `IF NOT EXISTS` so it's safe to run multiple times

### Error: "Permission denied"
- Make sure you're logged into the correct Supabase project
- Check that you have admin/owner permissions

### Still seeing "Could not find the 'journal_mode' column"
1. Run the migration in Supabase
2. Wait 10 seconds for cache to clear
3. Hard refresh your app: `Cmd/Ctrl + Shift + R`
4. Clear browser cache if needed

## 📊 Verify Migration Success

Run these queries in Supabase SQL Editor to verify:

**Check user_settings columns:**
```sql
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
  AND column_name IN ('journal_mode', 'custom_setups');
```

**Check trades table column:**
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'trades' 
  AND column_name = 'bias_snapshot';
```

You should see all 3 columns listed!

## 🎉 Done!

After running the migration, your two-tier journal system will work perfectly!

---

**Need help?** The migration is safe and can be run multiple times without issues.

