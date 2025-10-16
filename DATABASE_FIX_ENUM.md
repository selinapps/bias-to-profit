# Fix Market State Enum Error

If you're getting the error: `invalid input value for enum market_state_enum: "IN_BALANCE"`, your database needs to be updated.

## Quick Fix

1. **Open your Supabase project** at https://app.supabase.com/

2. **Go to SQL Editor** (left sidebar)

3. **Run this SQL**:

```sql
-- Ensure market_state_enum has all required values
DO $$
BEGIN
  -- Add OUT_OF_BALANCE if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'OUT_OF_BALANCE' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'market_state_enum')
  ) THEN
    ALTER TYPE public.market_state_enum ADD VALUE 'OUT_OF_BALANCE';
  END IF;

  -- Add IN_BALANCE if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'IN_BALANCE' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'market_state_enum')
  ) THEN
    ALTER TYPE public.market_state_enum ADD VALUE 'IN_BALANCE';
  END IF;

  -- Add UNCLEAR if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'UNCLEAR' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'market_state_enum')
  ) THEN
    ALTER TYPE public.market_state_enum ADD VALUE 'UNCLEAR';
  END IF;
END$$;
```

4. **Click "Run"** or press `Ctrl+Enter` / `Cmd+Enter`

5. **Verify** by running:
```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'market_state_enum')
ORDER BY enumlabel;
```

You should see:
- `IN_BALANCE`
- `OUT_OF_BALANCE`
- `UNCLEAR`

## Alternative: Run Migration File

If you prefer, you can run the migration file directly:

```bash
# From your project root
cat supabase/migrations/20251013000000_fix_market_state_enum.sql | supabase db execute
```

## What This Fixes

This ensures your database has all three required market state enum values:
- **OUT_OF_BALANCE** - Market is trending strongly
- **IN_BALANCE** - Market is ranging/consolidating
- **UNCLEAR** - Market state is ambiguous

After running this, you'll be able to set bias for historical dates without errors! ✅

