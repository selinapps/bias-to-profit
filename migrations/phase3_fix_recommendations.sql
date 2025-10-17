-- ============================================================
-- PHASE 3: FIX - Safer Recommendation Generation
-- ============================================================
-- Purpose: Replace generate_recommendations with safer version
-- Date: 2024-10-17
-- ============================================================

-- Drop and recreate with better error handling
DROP FUNCTION IF EXISTS public.generate_recommendations(uuid);

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

  -- ============================================================
  -- 1. FOMO COST RECOMMENDATIONS
  -- ============================================================
  BEGIN
    v_error_context := 'FOMO cost analysis';
    
    INSERT INTO recommendations (
      user_id, category, priority, title, description, action, potential_impact, evidence, expires_at
    )
    SELECT 
      p_user_id,
      'discipline'::text,
      CASE 
        WHEN expected_gain_if_removed >= 5 THEN 'critical'
        WHEN expected_gain_if_removed >= 2 THEN 'high'
        ELSE 'medium'
      END::text,
      format('%s Trades Cost You %sR', 
        INITCAP(tag), 
        ROUND(ABS(total_r), 1)
      ),
      format('Last 60 days: %s trades with %s tag resulted in %sR total. Average: %sR with %s%% win rate. Eliminating these could improve performance by %sR.',
        trade_count,
        tag,
        ROUND(total_r, 1),
        ROUND(avg_r, 2),
        ROUND(win_rate, 0),
        ROUND(expected_gain_if_removed, 1)
      ),
      CASE 
        WHEN tag ILIKE '%fomo%' THEN 'Use pre-trade checklist on EVERY entry. If setup not on watchlist, do NOT trade.'
        WHEN tag ILIKE '%revenge%' THEN 'After a loss, take mandatory 30-minute break. Max 1 trade after a loss.'
        WHEN tag ILIKE '%impatient%' THEN 'Wait for full confirmation. Set alerts and walk away.'
        ELSE 'Focus on following your trading plan consistently.'
      END::text,
      expected_gain_if_removed,
      jsonb_build_object(
        'tag', tag,
        'trade_count', trade_count,
        'total_r', total_r,
        'avg_r', avg_r,
        'win_rate', win_rate,
        'period', '60 days'
      ),
      now() + interval '30 days'
    FROM get_fomo_cost_analysis(p_user_id)
    WHERE expected_gain_if_removed > 1.0;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    recommendation_count := recommendation_count + rows_inserted;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in %: %', v_error_context, SQLERRM;
  END;

  -- ============================================================
  -- 2. CONTINUATION OPPORTUNITY RECOMMENDATIONS
  -- ============================================================
  BEGIN
    v_error_context := 'Continuation opportunities';
    
    INSERT INTO recommendations (
      user_id, category, priority, title, description, action, potential_impact, evidence, expires_at
    )
    SELECT 
      p_user_id,
      'continuation'::text,
      CASE 
        WHEN potential_improvement_r >= 10 THEN 'high'
        WHEN potential_improvement_r >= 5 THEN 'medium'
        ELSE 'low'
      END::text,
      format('%s Setup: Hold Longer for +%sR', 
        setup_name, 
        ROUND(potential_improvement_r, 1)
      ),
      format('%s trades continue %s%% after target, moving %sR more on average. Based on %s trades, holding %s%% of position could improve by ~%sR.',
        setup_name,
        ROUND(continuation_rate, 0),
        ROUND(avg_extra_r, 1),
        target_hit_trades,
        ROUND(recommended_hold_fraction * 100, 0),
        ROUND(potential_improvement_r, 1)
      ),
      format('When %s hits target: Close %s%%, hold %s%% with 1 ATR trailing stop.',
        setup_name,
        ROUND((1 - recommended_hold_fraction) * 100, 0),
        ROUND(recommended_hold_fraction * 100, 0)
      )::text,
      potential_improvement_r,
      jsonb_build_object(
        'setup_name', setup_name,
        'continuation_rate', continuation_rate,
        'avg_extra_r', avg_extra_r,
        'target_hit_trades', target_hit_trades,
        'recommended_hold_fraction', recommended_hold_fraction,
        'period', '60 days'
      ),
      now() + interval '30 days'
    FROM get_continuation_opportunities(p_user_id)
    WHERE potential_improvement_r >= 3.0;

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    recommendation_count := recommendation_count + rows_inserted;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in %: %', v_error_context, SQLERRM;
  END;

  -- ============================================================
  -- 3. CONFIDENCE CALIBRATION RECOMMENDATIONS
  -- ============================================================
  BEGIN
    v_error_context := 'Confidence calibration';
    
    INSERT INTO recommendations (
      user_id, category, priority, title, description, action, potential_impact, evidence, expires_at
    )
    SELECT 
      p_user_id,
      'confidence'::text,
      CASE 
        WHEN calibration_flag = 'overconfident' THEN 'high'
        WHEN calibration_flag = 'underconfident' THEN 'medium'
        ELSE 'low'
      END::text,
      CASE 
        WHEN calibration_flag = 'well_calibrated' THEN format('Level %s: Well Calibrated ✓', confidence_level)
        WHEN calibration_flag = 'overconfident' THEN format('Level %s: Overconfident Warning', confidence_level)
        WHEN calibration_flag = 'underconfident' THEN format('Level %s: Trust More', confidence_level)
        ELSE format('Level %s: Review', confidence_level)
      END::text,
      CASE 
        WHEN calibration_flag = 'well_calibrated' 
          THEN format('Level %s trades perform well: %s%% win rate, %sR average (%s trades). Your assessment is accurate.',
            confidence_level, ROUND(win_rate, 0), ROUND(avg_r, 2), trade_count)
        WHEN calibration_flag = 'overconfident'
          THEN format('Level %s underperforms: %s%% win rate, %sR average (%s trades). You may be overestimating quality.',
            confidence_level, ROUND(win_rate, 0), ROUND(avg_r, 2), trade_count)
        WHEN calibration_flag = 'underconfident'
          THEN format('Level %s outperforms: %s%% win rate, %sR average (%s trades). You are too conservative.',
            confidence_level, ROUND(win_rate, 0), ROUND(avg_r, 2), trade_count)
        ELSE format('Level %s: %s%% win, %sR avg (%s trades).',
            confidence_level, ROUND(win_rate, 0), ROUND(avg_r, 2), trade_count)
      END::text,
      CASE 
        WHEN calibration_flag = 'well_calibrated' THEN 'Continue using confidence levels as-is.'
        WHEN calibration_flag = 'overconfident' THEN 'Reduce position size until calibration improves.'
        WHEN calibration_flag = 'underconfident' THEN 'Consider increasing position size on these trades.'
        ELSE 'Continue tracking. More data needed.'
      END::text,
      0::numeric, -- No direct R impact for calibration
      jsonb_build_object(
        'confidence_level', confidence_level,
        'trade_count', trade_count,
        'win_rate', win_rate,
        'avg_r', avg_r,
        'flag', calibration_flag,
        'period', '60 days'
      ),
      now() + interval '30 days'
    FROM get_confidence_calibration(p_user_id);

    GET DIAGNOSTICS rows_inserted = ROW_COUNT;
    recommendation_count := recommendation_count + rows_inserted;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in %: %', v_error_context, SQLERRM;
  END;

  -- Return total count (even if some sections failed)
  RETURN recommendation_count;
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail completely
  RAISE WARNING 'generate_recommendations error: %', SQLERRM;
  RETURN 0;
END;
$$;

COMMENT ON FUNCTION public.generate_recommendations IS 'Safely generates all recommendation types with error handling';

-- ============================================================
-- TEST: Run manually to see specific errors
-- ============================================================

-- Test each detector individually first
-- SELECT * FROM get_fomo_cost_analysis(auth.uid());
-- SELECT * FROM get_continuation_opportunities(auth.uid());
-- SELECT * FROM get_confidence_calibration(auth.uid());

-- Then test the generator
-- SELECT generate_recommendations(auth.uid());

-- Check for warnings in PostgreSQL logs if count is 0

