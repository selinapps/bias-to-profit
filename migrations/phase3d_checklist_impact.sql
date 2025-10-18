-- ============================================================
-- PHASE 3D: CHECKLIST IMPACT ANALYZER
-- ============================================================
-- Purpose: Track which checklist items skipped and their performance impact
-- Date: 2024-10-17
-- Version: v2.5.0
-- ============================================================

-- ============================================================
-- SCHEMA: Add checklist tracking to trades
-- ============================================================

-- Add column to store which checklist items were skipped
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS checklist_items_skipped text[];

-- Add column to store all checklist items (for historical reference)
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS checklist_items_all text[];

-- Create index for querying skipped items
CREATE INDEX IF NOT EXISTS idx_trades_checklist_skipped 
ON public.trades USING GIN(checklist_items_skipped);

COMMENT ON COLUMN public.trades.checklist_items_skipped IS 'Array of checklist items that were unchecked/skipped for this trade';
COMMENT ON COLUMN public.trades.checklist_items_all IS 'Array of all checklist items that were shown (for historical reference)';

-- ============================================================
-- RPC: Get Checklist Item Impact Analysis
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_checklist_item_impact(p_user_id uuid)
RETURNS TABLE (
  item_text text,
  times_skipped bigint,
  times_not_skipped bigint,
  win_rate_when_skipped numeric,
  win_rate_when_not_skipped numeric,
  avg_r_when_skipped numeric,
  avg_r_when_not_skipped numeric,
  impact_difference numeric,
  impact_total_r numeric,
  recommendation_priority text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH all_items AS (
    -- Get all unique checklist items ever used
    SELECT DISTINCT unnest(checklist_items_all) as item
    FROM trades
    WHERE user_id = p_user_id
      AND checklist_items_all IS NOT NULL
      AND status = 'closed'
      AND created_at > now() - interval '90 days'
  ),
  item_stats AS (
    SELECT 
      ai.item,
      -- Count trades where this item was skipped
      COUNT(*) FILTER (WHERE ai.item = ANY(t.checklist_items_skipped)) as skipped_count,
      -- Count trades where this item was NOT skipped (was on list but not in skipped array)
      COUNT(*) FILTER (
        WHERE ai.item = ANY(t.checklist_items_all) 
          AND (t.checklist_items_skipped IS NULL OR NOT (ai.item = ANY(t.checklist_items_skipped)))
      ) as not_skipped_count,
      -- Performance when skipped
      AVG(COALESCE(t.r_multiple, 0)) FILTER (WHERE ai.item = ANY(t.checklist_items_skipped)) as avg_r_skipped,
      (COUNT(*) FILTER (
        WHERE ai.item = ANY(t.checklist_items_skipped) 
          AND COALESCE(t.r_multiple, 0) > 0
      )::numeric / NULLIF(COUNT(*) FILTER (WHERE ai.item = ANY(t.checklist_items_skipped)), 0) * 100) as wr_skipped,
      -- Performance when NOT skipped
      AVG(COALESCE(t.r_multiple, 0)) FILTER (
        WHERE ai.item = ANY(t.checklist_items_all) 
          AND (t.checklist_items_skipped IS NULL OR NOT (ai.item = ANY(t.checklist_items_skipped)))
      ) as avg_r_not_skipped,
      (COUNT(*) FILTER (
        WHERE ai.item = ANY(t.checklist_items_all) 
          AND (t.checklist_items_skipped IS NULL OR NOT (ai.item = ANY(t.checklist_items_skipped)))
          AND COALESCE(t.r_multiple, 0) > 0
      )::numeric / NULLIF(COUNT(*) FILTER (
        WHERE ai.item = ANY(t.checklist_items_all) 
          AND (t.checklist_items_skipped IS NULL OR NOT (ai.item = ANY(t.checklist_items_skipped)))
      ), 0) * 100) as wr_not_skipped
    FROM all_items ai
    CROSS JOIN trades t
    WHERE t.user_id = p_user_id
      AND t.status = 'closed'
      AND t.created_at > now() - interval '90 days'
      AND ai.item = ANY(t.checklist_items_all)
    GROUP BY ai.item
    HAVING COUNT(*) FILTER (WHERE ai.item = ANY(t.checklist_items_skipped)) >= 3 -- Need at least 3 skips for significance
  )
  SELECT 
    ist.item::text as item_text,
    ist.skipped_count::bigint as times_skipped,
    ist.not_skipped_count::bigint as times_not_skipped,
    COALESCE(ist.wr_skipped, 0)::numeric as win_rate_when_skipped,
    COALESCE(ist.wr_not_skipped, 0)::numeric as win_rate_when_not_skipped,
    COALESCE(ist.avg_r_skipped, 0)::numeric as avg_r_when_skipped,
    COALESCE(ist.avg_r_not_skipped, 0)::numeric as avg_r_when_not_skipped,
    -- Impact difference (negative = bad when skipped, positive = good when skipped)
    (COALESCE(ist.avg_r_skipped, 0) - COALESCE(ist.avg_r_not_skipped, 0))::numeric as impact_difference,
    -- Total R cost of skipping this item
    ((COALESCE(ist.avg_r_not_skipped, 0) - COALESCE(ist.avg_r_skipped, 0)) * ist.skipped_count)::numeric as impact_total_r,
    -- Priority recommendation
    CASE 
      WHEN (COALESCE(ist.avg_r_not_skipped, 0) - COALESCE(ist.avg_r_skipped, 0)) * ist.skipped_count >= 5 THEN 'critical'
      WHEN (COALESCE(ist.avg_r_not_skipped, 0) - COALESCE(ist.avg_r_skipped, 0)) * ist.skipped_count >= 2 THEN 'high'
      WHEN (COALESCE(ist.avg_r_not_skipped, 0) - COALESCE(ist.avg_r_skipped, 0)) * ist.skipped_count >= 1 THEN 'medium'
      ELSE 'low'
    END::text as recommendation_priority
  FROM item_stats ist
  WHERE ist.skipped_count > 0
  ORDER BY impact_total_r DESC;
END;
$$;

COMMENT ON FUNCTION public.get_checklist_item_impact IS 'Analyzes performance impact of skipping specific checklist items';

-- ============================================================
-- UPDATE: Add checklist recommendations to generator
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_checklist_recommendations(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recommendation_count integer := 0;
BEGIN
  -- Generate recommendations for high-impact checklist items
  INSERT INTO recommendations (
    user_id, category, priority, title, description, action, potential_impact, evidence, expires_at
  )
  SELECT 
    p_user_id,
    'checklist'::text,
    recommendation_priority,
    format('Skipping "%s" Costs You %sR', 
      item_text, 
      ROUND(ABS(impact_total_r), 1)
    ),
    format('Last 90 days analysis: You skipped "%s" %s times. Win rate when skipped: %s%% (avg %sR). Win rate when NOT skipped: %s%% (avg %sR). Skipping this item costs approximately %sR per trade × %s trades = %sR total.',
      item_text,
      times_skipped,
      ROUND(win_rate_when_skipped, 0),
      ROUND(avg_r_when_skipped, 2),
      ROUND(win_rate_when_not_skipped, 0),
      ROUND(avg_r_when_not_skipped, 2),
      ROUND(ABS(impact_difference), 2),
      times_skipped,
      ROUND(ABS(impact_total_r), 1)
    ),
    CASE 
      WHEN ABS(impact_difference) >= 2.0 THEN format('NEVER skip "%s" - it is critical to your edge. This item has the highest impact on your performance. Make it non-negotiable.', item_text)
      WHEN ABS(impact_difference) >= 1.0 THEN format('Avoid skipping "%s" whenever possible. Set a reminder or alert to ensure you check this item.', item_text)
      WHEN ABS(impact_difference) >= 0.5 THEN format('Try not to skip "%s". While not critical, it does improve your results.', item_text)
      ELSE format('"%s" has minimal impact. You can skip when necessary.', item_text)
    END::text,
    impact_total_r,
    jsonb_build_object(
      'item', item_text,
      'times_skipped', times_skipped,
      'times_not_skipped', times_not_skipped,
      'win_rate_skipped', win_rate_when_skipped,
      'win_rate_not_skipped', win_rate_when_not_skipped,
      'avg_r_skipped', avg_r_when_skipped,
      'avg_r_not_skipped', avg_r_when_not_skipped,
      'impact_per_trade', impact_difference,
      'analysis_period', '90 days'
    ),
    now() + interval '30 days'
  FROM get_checklist_item_impact(p_user_id)
  WHERE impact_total_r >= 1.0 -- Only show if significant impact (>= 1R total)
    AND times_skipped >= 3; -- Need at least 3 instances

  GET DIAGNOSTICS recommendation_count = ROW_COUNT;
  
  RETURN recommendation_count;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error generating checklist recommendations: %', SQLERRM;
  RETURN 0;
END;
$$;

COMMENT ON FUNCTION public.generate_checklist_recommendations IS 'Generates recommendations for high-impact checklist items';

-- ============================================================
-- UPDATE: Add checklist to master generator
-- ============================================================

-- Update the master generate_recommendations to include checklist
CREATE OR REPLACE FUNCTION public.generate_recommendations(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recommendation_count integer := 0;
  rows_inserted integer := 0;
  v_error_context text;
BEGIN
  -- Clear old active recommendations (older than 30 days)
  BEGIN
    DELETE FROM recommendations 
    WHERE user_id = p_user_id 
      AND status = 'active'
      AND created_at < now() - interval '30 days';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error clearing old recommendations: %', SQLERRM;
  END;

  -- Generate each recommendation type (with error handling)
  
  -- 1. FOMO Cost
  BEGIN
    INSERT INTO recommendations (user_id, category, priority, title, description, action, potential_impact, evidence, expires_at)
    SELECT p_user_id, 'discipline'::text,
      CASE WHEN expected_gain_if_removed >= 5 THEN 'critical' WHEN expected_gain_if_removed >= 2 THEN 'high' ELSE 'medium' END::text,
      format('%s Trades Cost You %sR', INITCAP(tag), ROUND(ABS(total_r), 1)),
      format('Last 60 days: %s trades with %s tag = %sR total. Average: %sR, %s%% win rate. Eliminating: +%sR.',
        trade_count, tag, ROUND(total_r, 1), ROUND(avg_r, 2), ROUND(win_rate, 0), ROUND(expected_gain_if_removed, 1)),
      CASE WHEN tag ILIKE '%fomo%' THEN 'Use pre-trade checklist ALWAYS. No exceptions.'
           WHEN tag ILIKE '%revenge%' THEN 'After loss: 30-min break. Max 1 trade after loss.'
           ELSE 'Follow your trading plan consistently.' END::text,
      expected_gain_if_removed,
      jsonb_build_object('tag', tag, 'trade_count', trade_count, 'total_r', total_r, 'avg_r', avg_r, 'win_rate', win_rate, 'period', '60 days'),
      now() + interval '30 days'
    FROM get_fomo_cost_analysis(p_user_id) WHERE expected_gain_if_removed > 1.0;
    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    recommendation_count := recommendation_count + rows_inserted;
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Error in FOMO analysis: %', SQLERRM; END;

  -- 2. Continuation Opportunities
  BEGIN
    INSERT INTO recommendations (user_id, category, priority, title, description, action, potential_impact, evidence, expires_at)
    SELECT p_user_id, 'continuation'::text,
      CASE WHEN potential_improvement_r >= 10 THEN 'high' WHEN potential_improvement_r >= 5 THEN 'medium' ELSE 'low' END::text,
      format('%s Setup: Hold Longer for +%sR', setup_name, ROUND(potential_improvement_r, 1)),
      format('%s continues %s%% after target, moving %sR more. Based on %s trades, hold %s%% for ~%sR improvement.',
        setup_name, ROUND(continuation_rate, 0), ROUND(avg_extra_r, 1), target_hit_trades, 
        ROUND(recommended_hold_fraction * 100, 0), ROUND(potential_improvement_r, 1)),
      format('When %s hits target: Close %s%%, hold %s%% with 1 ATR trail.',
        setup_name, ROUND((1 - recommended_hold_fraction) * 100, 0), ROUND(recommended_hold_fraction * 100, 0))::text,
      potential_improvement_r,
      jsonb_build_object('setup_name', setup_name, 'continuation_rate', continuation_rate, 'avg_extra_r', avg_extra_r, 
                         'target_hit_trades', target_hit_trades, 'recommended_hold_fraction', recommended_hold_fraction, 'period', '60 days'),
      now() + interval '30 days'
    FROM get_continuation_opportunities(p_user_id) WHERE potential_improvement_r >= 3.0;
    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    recommendation_count := recommendation_count + rows_inserted;
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Error in continuation analysis: %', SQLERRM; END;

  -- 3. Confidence Calibration
  BEGIN
    INSERT INTO recommendations (user_id, category, priority, title, description, action, potential_impact, evidence, expires_at)
    SELECT p_user_id, 'confidence'::text,
      CASE WHEN calibration_flag = 'overconfident' THEN 'high'
           WHEN calibration_flag = 'underconfident' THEN 'medium' ELSE 'low' END::text,
      CASE WHEN calibration_flag = 'well_calibrated' THEN format('Level %s: Well Calibrated ✓', confidence_level)
           WHEN calibration_flag = 'overconfident' THEN format('Level %s: Overconfident', confidence_level)
           WHEN calibration_flag = 'underconfident' THEN format('Level %s: Trust More', confidence_level)
           ELSE format('Level %s: Review', confidence_level) END::text,
      CASE WHEN calibration_flag = 'well_calibrated' THEN format('Level %s: %s%% win, %sR avg (%s trades). Well calibrated.',
             confidence_level, ROUND(win_rate, 0), ROUND(avg_r, 2), trade_count)
           WHEN calibration_flag = 'overconfident' THEN format('Level %s: %s%% win, %sR avg (%s trades). Underperforming.',
             confidence_level, ROUND(win_rate, 0), ROUND(avg_r, 2), trade_count)
           ELSE format('Level %s: %s%% win, %sR avg (%s trades). Outperforming.',
             confidence_level, ROUND(win_rate, 0), ROUND(avg_r, 2), trade_count) END::text,
      CASE WHEN calibration_flag = 'well_calibrated' THEN 'Continue as-is.'
           WHEN calibration_flag = 'overconfident' THEN 'Reduce position size.'
           ELSE 'Consider increasing size.' END::text,
      0::numeric,
      jsonb_build_object('confidence_level', confidence_level, 'trade_count', trade_count, 'win_rate', win_rate, 
                         'avg_r', avg_r, 'flag', calibration_flag, 'period', '60 days'),
      now() + interval '30 days'
    FROM get_confidence_calibration(p_user_id);
    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    recommendation_count := recommendation_count + rows_inserted;
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Error in confidence analysis: %', SQLERRM; END;

  -- 4. ✅ NEW: Checklist Item Impact
  BEGIN
    rows_inserted := generate_checklist_recommendations(p_user_id);
    recommendation_count := recommendation_count + rows_inserted;
  EXCEPTION WHEN OTHERS THEN 
    RAISE WARNING 'Error in checklist analysis: %', SQLERRM;
  END;

  RETURN recommendation_count;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'generate_recommendations error: %', SQLERRM;
  RETURN 0;
END;
$$;

COMMENT ON FUNCTION public.generate_recommendations IS 'Master generator with checklist impact analysis';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Test checklist impact analysis
-- SELECT * FROM get_checklist_item_impact(auth.uid());

-- Generate all recommendations (including checklist)
-- SELECT generate_recommendations(auth.uid());

-- View checklist recommendations
-- SELECT * FROM recommendations 
-- WHERE user_id = auth.uid() AND category = 'checklist' AND status = 'active';

