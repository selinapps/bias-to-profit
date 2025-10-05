# Manual Index Creation Guide

If you're getting the "CREATE INDEX CONCURRENTLY cannot run inside a transaction block" error, use this manual approach.

## Option 1: Use the Manual Script
```sql
\i create_indexes_manually.sql
```

## Option 2: Run Commands One by One

Run these commands individually in your SQL client:

### 1. Create covering index for trades
```sql
CREATE INDEX IF NOT EXISTS idx_trades_user_status_covering 
ON public.trades(user_id, status, entry_time DESC) 
INCLUDE (asset, direction, model, pnl, r_multiple, exit_time);
```

### 2. Create daily performance index
```sql
CREATE INDEX IF NOT EXISTS idx_trades_daily_perf_covering 
ON public.trades(user_id, DATE(entry_time), status) 
INCLUDE (pnl, r_multiple, model, exit_time);
```

### 3. Create bias state index
```sql
CREATE INDEX IF NOT EXISTS idx_bias_state_latest_active 
ON public.bias_state(day_key, active, selected_at DESC) 
WHERE active = true;
```

### 4. Create user date status index
```sql
CREATE INDEX IF NOT EXISTS idx_trades_user_date_status 
ON public.trades(user_id, DATE(entry_time), status);
```

### 5. Create exit date PnL index
```sql
CREATE INDEX IF NOT EXISTS idx_trades_user_exit_date_pnl 
ON public.trades(user_id, DATE(exit_time), pnl) 
WHERE exit_time IS NOT NULL AND pnl IS NOT NULL;
```

## Option 3: Skip Indexes Entirely

The indexes are optional for security fixes. Your database is already:
- ✅ Secure (all vulnerabilities fixed)
- ✅ Optimized (materialized views optimized)
- ✅ Functional (all features working)

The indexes are just additional performance improvements.

## Verification

After creating indexes, verify with:
```sql
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```
