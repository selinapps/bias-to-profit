-- ============================================================
-- QUICK FIX: Test each component to find the error
-- ============================================================
-- Run these ONE AT A TIME and report which one fails
-- ============================================================

-- STEP 1: Test the simplest function first
SELECT * FROM get_fomo_cost_analysis(auth.uid());
-- If this fails → Report the exact error message

-- STEP 2: Test continuation (depends on get_continuation_by_setup)
SELECT * FROM get_continuation_opportunities(auth.uid());
-- If this fails → The issue is likely with post_trade_observations table

-- STEP 3: Test confidence
SELECT * FROM get_confidence_calibration(auth.uid());
-- If this fails → The issue is likely with confidence column

-- ============================================================
-- MOST LIKELY ISSUE: Missing prerequisite function
-- ============================================================

-- Check if get_continuation_by_setup exists (from Phase 2B)
SELECT COUNT(*) as exists
FROM pg_proc
WHERE proname = 'get_continuation_by_setup';

-- If returns 0: You need to run migrations/create_views_phase2b.sql first!

-- ============================================================
-- TEMPORARY WORKAROUND: Simplified generator
-- ============================================================
-- If above functions fail, use this minimal version:

CREATE OR REPLACE FUNCTION public.generate_recommendations_simple(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recommendation_count integer := 0;
BEGIN
  -- Clear old recommendations
  DELETE FROM recommendations 
  WHERE user_id = p_user_id 
    AND status = 'active'
    AND created_at < now() - interval '30 days';

  -- Only generate FOMO recommendations (simplest, most impactful)
  INSERT INTO recommendations (
    user_id, category, priority, title, description, potential_impact, status
  )
  WITH fomo_trades AS (
    SELECT 
      COUNT(*) as fomo_count,
      SUM(COALESCE(r_multiple, 0)) as total_r,
      AVG(COALESCE(r_multiple, 0)) as avg_r
    FROM trades
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND discipline_tag ILIKE '%fomo%'
      AND created_at > now() - interval '60 days'
  ),
  plan_trades AS (
    SELECT AVG(COALESCE(r_multiple, 0)) as avg_r
    FROM trades
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND (discipline_tag ILIKE '%follow%' OR discipline_tag ILIKE '%plan%')
      AND created_at > now() - interval '60 days'
  )
  SELECT 
    p_user_id,
    'discipline',
    'critical',
    format('FOMO Trades Cost You %sR', ROUND(ABS(f.total_r), 1)),
    format('Last 60 days: %s FOMO trades resulted in %sR total. Your "Followed Plan" trades averaged %sR. Eliminating FOMO could improve by %sR.',
      f.fomo_count,
      ROUND(f.total_r, 1),
      ROUND(COALESCE(p.avg_r, 0), 1),
      ROUND(ABS(f.total_r), 1)
    ),
    ABS(f.total_r),
    'active'
  FROM fomo_trades f
  CROSS JOIN plan_trades p
  WHERE f.fomo_count > 0 AND f.total_r < 0;

  GET DIAGNOSTICS recommendation_count = ROW_COUNT;
  
  RETURN recommendation_count;
END;
$$;

-- Test the simple version
-- SELECT generate_recommendations_simple(auth.uid());

-- If this works, the issue is with the complex detectors
-- If this fails too, the issue is with the recommendations table itself

