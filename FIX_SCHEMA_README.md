# 🔧 Fix Database Schema Issues

## Problem
You're seeing these errors:
- ❌ `406 (Not Acceptable)` when loading user_settings
- ❌ `400 (Bad Request)` when creating user_settings
- ❌ `"Could not find the 'default_model' column of 'user_settings' in the schema cache"`

## Root Cause
The `user_settings` table in your Supabase database is **missing the `default_model` column** that the application code expects.

## Solution

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project: https://supabase.com/dashboard/project/zbmpysqxauzfrbvroboh
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Fix Script
Copy the entire contents of `FIX_SCHEMA_ISSUES.sql` and paste it into the SQL editor, then click **Run**.

Or run this quick fix:

```sql
-- Quick fix: Add the missing column
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS default_model text DEFAULT 'trend';

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
```

### Step 3: Verify the Fix
After running the SQL, you should see:
```
✅ default_model column exists!
```

### Step 4: Refresh Your App
1. **Hard refresh** your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear your browser cache if needed
3. The errors should be gone!

## Why This Happened

The database migrations were run in the wrong order or some migrations were skipped. The code expects `default_model` but only `last_model` was created.

## What We Fixed

Added the missing `default_model` column to store the user's preferred trading model (trend or mean_reversion).

## Still Having Issues?

If you still see errors after running the fix:

1. **Check if the column exists:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'user_settings' 
   AND table_schema = 'public'
   ORDER BY ordinal_position;
   ```

2. **Force Supabase to reload the schema:**
   - Go to **Settings** → **API** in Supabase
   - Click **Restart** to restart the PostgREST API
   - Wait 30 seconds and try again

3. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'user_settings';
   ```

## Prevention

To prevent this in the future, always run migrations in order by their timestamp prefix.

