# Database Security and Performance Fix

This document provides comprehensive fixes for your Supabase database security vulnerabilities and performance issues.

## Issues Fixed

### 1. Security Vulnerabilities
- **SECURITY DEFINER Views**: Fixed `public.secure_daily_performance_metrics` and `public.v_current_bias` views
- **Mutable Search Path Functions**: Fixed `public.get_daily_losses` and `public.get_user_trade_stats` functions
- **Materialized View Access**: Fixed `public.daily_performance_metrics` access permissions

### 2. Performance Optimizations
- Added covering indexes for common query patterns
- Optimized materialized view structure
- Created performance monitoring functions
- Added automated maintenance functions

## Files Included

1. **`apply_complete_database_fix.sql`** - Main fix script (RECOMMENDED)
2. **`fix_database_security_and_performance.sql`** - Detailed security fixes
3. **`advanced_performance_optimizations.sql`** - Advanced performance optimizations
4. **`test_database_fixes.sql`** - Test script to verify fixes
5. **`DATABASE_FIX_README.md`** - This documentation

## How to Apply the Fixes

### Option 1: Complete Fix (Recommended)
```sql
-- Run this single script to apply all fixes
\i apply_complete_database_fix.sql
```

### Option 2: Step-by-Step Fix
```sql
-- 1. Apply security fixes
\i fix_database_security_and_performance.sql

-- 2. Apply performance optimizations
\i advanced_performance_optimizations.sql

-- 3. Test the fixes
\i test_database_fixes.sql
```

## What Each Fix Does

### Security Fixes

#### 1. SECURITY DEFINER Views Fix
**Problem**: Views with SECURITY DEFINER property bypass user permissions
**Solution**: Convert to `security_invoker` views that respect user permissions

```sql
-- Before (VULNERABLE)
CREATE VIEW public.v_current_bias AS ...

-- After (SECURE)
CREATE VIEW public.v_current_bias 
WITH (security_invoker = true) AS ...
```

#### 2. Function Search Path Fix
**Problem**: Functions without explicit search_path are vulnerable to injection
**Solution**: Set explicit search_path in all functions

```sql
-- Before (VULNERABLE)
CREATE FUNCTION public.get_daily_losses(...)
RETURNS integer AS ...

-- After (SECURE)
CREATE FUNCTION public.get_daily_losses(...)
RETURNS integer 
SET search_path = public, extensions AS ...
```

#### 3. Materialized View Access Fix
**Problem**: Materialized views don't support RLS, allowing unauthorized access
**Solution**: Remove direct access and use secure views

```sql
-- Remove direct access
REVOKE SELECT ON public.daily_performance_metrics FROM anon, authenticated;

-- Use secure view instead
GRANT SELECT ON public.secure_daily_performance_metrics TO authenticated;
```

### Performance Optimizations

#### 1. Covering Indexes
Added indexes that include all columns needed for common queries:

```sql
CREATE INDEX idx_trades_user_status_covering 
ON public.trades(user_id, status, entry_time DESC) 
INCLUDE (asset, direction, model, pnl, r_multiple, exit_time);
```

#### 2. Optimized Materialized View
Recreated with better indexing and structure:

```sql
CREATE UNIQUE INDEX idx_daily_performance_user_date_unique 
ON public.daily_performance_metrics(user_id, trade_date);
```

#### 3. Performance Monitoring
Added functions to monitor database health and performance:

```sql
-- Check database health
SELECT * FROM public.database_health_check();

-- Analyze table bloat
SELECT * FROM public.analyze_table_bloat();
```

## Testing the Fixes

After applying the fixes, run the test script:

```sql
\i test_database_fixes.sql
```

This will verify:
- ✅ SECURITY DEFINER views are fixed
- ✅ Functions have proper search_path
- ✅ Materialized view access is secure
- ✅ Performance indexes are created
- ✅ Functions execute correctly
- ✅ Views are accessible
- ✅ RLS policies are in place

## Expected Results

### Security Improvements
- No more SECURITY DEFINER views
- All functions have explicit search_path
- Materialized view access is properly controlled
- RLS policies are comprehensive

### Performance Improvements
- Faster query execution due to covering indexes
- Optimized materialized view refresh
- Better index usage statistics
- Reduced query execution time

## Monitoring and Maintenance

### Health Check
Run this regularly to ensure database health:

```sql
SELECT * FROM public.database_health_check();
```

### Performance Monitoring
Monitor slow queries and table bloat:

```sql
-- Check slow queries
SELECT * FROM public.slow_queries;

-- Check table bloat
SELECT * FROM public.analyze_table_bloat();
```

### Automated Maintenance
The fixes include functions for automated maintenance:

```sql
-- Refresh materialized views
SELECT public.refresh_daily_performance_metrics();

-- Clean up old data
SELECT public.cleanup_old_data();
```

## Troubleshooting

### If Tests Fail

1. **Permission Issues**: Ensure you're running as a superuser or have necessary privileges
2. **Function Errors**: Check if all dependencies are installed
3. **Index Creation**: Some indexes are created with CONCURRENTLY - they may take time

### Common Issues

1. **"relation does not exist"**: Run the complete fix script in order
2. **"permission denied"**: Ensure proper user permissions
3. **"function already exists"**: The script handles this with CREATE OR REPLACE

### Rollback

If you need to rollback changes:

```sql
-- Restore from backup schema
-- (The script creates a backup schema before making changes)
```

## Performance Impact

### Positive Impacts
- Faster query execution
- Better index utilization
- Reduced CPU usage
- Improved response times

### Considerations
- Index creation may take time (done with CONCURRENTLY where possible)
- Materialized view refresh may be slower initially
- Some disk space used for additional indexes

## Security Benefits

### Before Fix
- Views bypassed user permissions
- Functions vulnerable to injection
- Unauthorized access to materialized views
- Inconsistent security policies

### After Fix
- All views respect user permissions
- Functions are injection-resistant
- Proper access control on all objects
- Comprehensive RLS policies

## Support

If you encounter issues:

1. Check the test script output for specific failures
2. Verify all prerequisites are met
3. Ensure proper user permissions
4. Check database logs for detailed error messages

## Next Steps

After applying these fixes:

1. Monitor database performance
2. Set up automated maintenance schedules
3. Regularly run health checks
4. Consider additional optimizations based on usage patterns

Your database is now secure and optimized for better performance!