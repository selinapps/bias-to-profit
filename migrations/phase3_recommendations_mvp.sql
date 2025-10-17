-- ============================================================
-- PHASE 3: RECOMMENDATION ENGINE MVP
-- ============================================================
-- Purpose: Create intelligent recommendations based on trading data
-- Date: 2024-10-17
-- Version: v2.4.0
-- ============================================================

-- ============================================================
-- TABLE: recommendations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recommendations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Classification
  category text NOT NULL, -- 'discipline', 'continuation', 'confidence', 'stop', 'exit', 'session', 'risk'
  priority text NOT NULL DEFAULT 'medium', -- 'critical', 'high', 'medium', 'low'
  
  -- Content
  title text NOT NULL,
  description text NOT NULL,
  action text, -- Specific actionable step
  potential_impact numeric, -- Expected R improvement (can be negative for warnings)
  
  -- Supporting data
  evidence jsonb, -- JSON object with supporting metrics
  
  -- Lifecycle
  status text NOT NULL DEFAULT 'active', -- 'active', 'dismissed', 'implemented'
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz, -- Recommendations can expire (e.g., after 30 days)
  
  -- Metadata
  metadata jsonb -- Extra fields for future use
);

-- Indexes
CREATE INDEX idx_recommendations_user_id ON public.recommendations(user_id);
CREATE INDEX idx_recommendations_user_status ON public.recommendations(user_id, status);
CREATE INDEX idx_recommendations_priority ON public.recommendations(priority);
CREATE INDEX idx_recommendations_category ON public.recommendations(category);
CREATE INDEX idx_recommendations_created_at ON public.recommendations(created_at DESC);

-- RLS Policies
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations"
  ON public.recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendations"
  ON public.recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON public.recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recommendations"
  ON public.recommendations FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.recommendations IS 'Intelligent trading recommendations generated from user data analysis';

-- ============================================================
-- RPC 1: FOMO Cost Calculator
-- ============================================================
-- Detects emotional trading patterns and calculates their cost

CREATE OR REPLACE FUNCTION public.get_fomo_cost_analysis(p_user_id uuid)
RETURNS TABLE (
  tag text,
  trade_count bigint,
  total_r numeric,
  avg_r numeric,
  win_rate numeric,
  expected_gain_if_removed numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH discipline_stats AS (
    SELECT 
      COALESCE(discipline_tag, 'untagged') as tag,
      COUNT(*) as trade_count,
      SUM(COALESCE(r_multiple, 0)) as total_r,
      AVG(COALESCE(r_multiple, 0)) as avg_r,
      (COUNT(*) FILTER (WHERE COALESCE(r_multiple, 0) > 0)::numeric / NULLIF(COUNT(*), 0) * 100) as win_rate
    FROM trades
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND created_at > now() - interval '60 days'
    GROUP BY COALESCE(discipline_tag, 'untagged')
  ),
  baseline AS (
    SELECT AVG(avg_r) as baseline_avg_r
    FROM discipline_stats
    WHERE tag IN ('followed_plan', 'Followed Plan', 'followed plan')
  )
  SELECT 
    ds.tag,
    ds.trade_count,
    ds.total_r,
    ds.avg_r,
    ds.win_rate,
    -- Expected gain if we remove negative tags
    CASE 
      WHEN ds.avg_r < 0 THEN ABS(ds.total_r)
      WHEN ds.avg_r < (SELECT baseline_avg_r FROM baseline) 
        THEN (SELECT baseline_avg_r FROM baseline) * ds.trade_count - ds.total_r
      ELSE 0
    END as expected_gain_if_removed
  FROM discipline_stats ds
  WHERE ds.tag IN ('FOMO', 'fomo', 'revenge', 'Revenge', 'impatient', 'Impatient')
    OR ds.avg_r < 0
  ORDER BY expected_gain_if_removed DESC;
END;
$$;

COMMENT ON FUNCTION public.get_fomo_cost_analysis IS 'Calculates cost of emotional trading patterns (FOMO, revenge, etc.)';

-- ============================================================
-- RPC 2: Continuation Opportunity Detector
-- ============================================================
-- Identifies setups where holding longer would improve results

CREATE OR REPLACE FUNCTION public.get_continuation_opportunities(p_user_id uuid)
RETURNS TABLE (
  setup_name text,
  continuation_rate numeric,
  avg_extra_r numeric,
  target_hit_trades bigint,
  recommended_hold_fraction numeric,
  potential_improvement_r numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH continuation_data AS (
    SELECT 
      t.setup_name,
      COUNT(DISTINCT o.id) as observations,
      COUNT(DISTINCT t.id) as target_hits,
      COUNT(*) FILTER (WHERE o.price_action = 'continuation')::numeric / NULLIF(COUNT(*), 0) * 100 as cont_rate,
      AVG(COALESCE(o.r_moved, 0)) as avg_r_moved
    FROM trades t
    LEFT JOIN post_trade_observations o ON o.trade_id = t.id AND o.observation_type = 'post_target'
    WHERE t.user_id = p_user_id
      AND t.status = 'closed'
      AND t.created_at > now() - interval '60 days'
    GROUP BY t.setup_name
    HAVING COUNT(DISTINCT o.id) >= 3 -- Need at least 3 observations for statistical significance
  )
  SELECT 
    cd.setup_name,
    cd.cont_rate as continuation_rate,
    cd.avg_r_moved as avg_extra_r,
    cd.target_hits as target_hit_trades,
    -- Recommend holding % based on continuation rate
    CASE 
      WHEN cd.cont_rate >= 70 THEN 0.50 -- Hold 50% if 70%+ continuation
      WHEN cd.cont_rate >= 50 THEN 0.30 -- Hold 30% if 50-70% continuation
      ELSE 0.00
    END as recommended_hold_fraction,
    -- Potential improvement = avg_extra_r × recommended_hold_fraction × trades
    cd.avg_r_moved * 
    CASE 
      WHEN cd.cont_rate >= 70 THEN 0.50
      WHEN cd.cont_rate >= 50 THEN 0.30
      ELSE 0.00
    END * cd.target_hits as potential_improvement_r
  FROM continuation_data cd
  WHERE cd.cont_rate >= 50 -- Only show opportunities with 50%+ continuation
    AND cd.avg_r_moved > 0.5 -- Only if there's meaningful extra movement
  ORDER BY potential_improvement_r DESC;
END;
$$;

COMMENT ON FUNCTION public.get_continuation_opportunities IS 'Identifies setups where holding longer after target would improve results';

-- ============================================================
-- RPC 3: Confidence Calibration Analyzer
-- ============================================================
-- Checks if confidence levels correlate with actual performance

CREATE OR REPLACE FUNCTION public.get_confidence_calibration(p_user_id uuid)
RETURNS TABLE (
  confidence_level integer,
  trade_count bigint,
  win_rate numeric,
  avg_r numeric,
  calibration_flag text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH confidence_stats AS (
    SELECT 
      confidence as level,
      COUNT(*) as trades,
      (COUNT(*) FILTER (WHERE COALESCE(r_multiple, 0) > 0)::numeric / NULLIF(COUNT(*), 0) * 100) as win_pct,
      AVG(COALESCE(r_multiple, 0)) as avg_r_val
    FROM trades
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND confidence IS NOT NULL
      AND created_at > now() - interval '60 days'
    GROUP BY confidence
    HAVING COUNT(*) >= 3 -- Need at least 3 trades per level
  ),
  expected_performance AS (
    -- Expected win rates by confidence level
    SELECT 1 as level, 40.0 as expected_wr, 0.5 as expected_r UNION ALL
    SELECT 2, 50.0, 1.0 UNION ALL
    SELECT 3, 60.0, 1.5 UNION ALL
    SELECT 4, 70.0, 2.0 UNION ALL
    SELECT 5, 80.0, 2.5
  )
  SELECT 
    cs.level::integer as confidence_level,
    cs.trades as trade_count,
    cs.win_pct as win_rate,
    cs.avg_r_val as avg_r,
    -- Calibration flag
    CASE 
      -- Well-calibrated
      WHEN cs.win_pct >= ep.expected_wr AND cs.avg_r_val >= ep.expected_r 
        THEN 'well_calibrated'
      -- Overconfident (high confidence, poor results)
      WHEN cs.level >= 4 AND (cs.win_pct < ep.expected_wr OR cs.avg_r_val < ep.expected_r)
        THEN 'overconfident'
      -- Underconfident (low confidence, good results)
      WHEN cs.level <= 2 AND (cs.win_pct > ep.expected_wr + 10 OR cs.avg_r_val > ep.expected_r + 0.5)
        THEN 'underconfident'
      -- Slightly off
      ELSE 'slightly_off'
    END as calibration_flag
  FROM confidence_stats cs
  JOIN expected_performance ep ON ep.level = cs.level
  ORDER BY cs.level;
END;
$$;

COMMENT ON FUNCTION public.get_confidence_calibration IS 'Analyzes if confidence levels match actual performance (calibration check)';

-- ============================================================
-- MASTER RPC: Generate All Recommendations
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_recommendations(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recommendation_count integer := 0;
BEGIN
  -- Clear old active recommendations (older than 30 days)
  DELETE FROM recommendations 
  WHERE user_id = p_user_id 
    AND status = 'active'
    AND created_at < now() - interval '30 days';

  -- ============================================================
  -- 1. FOMO COST RECOMMENDATIONS
  -- ============================================================
  INSERT INTO recommendations (
    user_id, category, priority, title, description, action, potential_impact, evidence, expires_at
  )
  SELECT 
    p_user_id,
    'discipline',
    CASE 
      WHEN expected_gain_if_removed >= 5 THEN 'critical'
      WHEN expected_gain_if_removed >= 2 THEN 'high'
      ELSE 'medium'
    END,
    format('%s Trades Cost You %sR', 
      INITCAP(tag), 
      ROUND(ABS(total_r), 1)
    ),
    format('Last 60 days: %s trades with %s tag resulted in %sR total. Average trade: %sR with %s%% win rate. Removing these trades would improve your performance by approximately %sR.',
      trade_count,
      tag,
      ROUND(total_r, 1),
      ROUND(avg_r, 2),
      ROUND(win_rate, 0),
      ROUND(expected_gain_if_removed, 1)
    ),
    CASE 
      WHEN tag IN ('FOMO', 'fomo') THEN 'Use pre-trade checklist on EVERY entry. If setup not on watchlist, do NOT trade. Consider 5-minute cooling period before entries.'
      WHEN tag IN ('revenge', 'Revenge') THEN 'After a loss, take mandatory 30-minute break. Review trade plan before next entry. Maximum 1 trade after a loss.'
      WHEN tag IN ('impatient', 'Impatient') THEN 'Wait for full confirmation signals. Set alerts and walk away. Better to miss an entry than force a bad one.'
      ELSE 'Focus on following your trading plan consistently. Track plan adherence daily.'
    END,
    expected_gain_if_removed,
    jsonb_build_object(
      'tag', tag,
      'trade_count', trade_count,
      'total_r', total_r,
      'avg_r', avg_r,
      'win_rate', win_rate,
      'analysis_period', '60 days'
    ),
    now() + interval '30 days'
  FROM get_fomo_cost_analysis(p_user_id)
  WHERE expected_gain_if_removed > 1.0; -- Only show if significant impact

  GET DIAGNOSTICS recommendation_count = ROW_COUNT;

  -- ============================================================
  -- 2. CONTINUATION OPPORTUNITY RECOMMENDATIONS
  -- ============================================================
  INSERT INTO recommendations (
    user_id, category, priority, title, description, action, potential_impact, evidence, expires_at
  )
  SELECT 
    p_user_id,
    'continuation',
    CASE 
      WHEN potential_improvement_r >= 10 THEN 'high'
      WHEN potential_improvement_r >= 5 THEN 'medium'
      ELSE 'low'
    END,
    format('%s Setup: Hold Longer for +%sR', 
      setup_name, 
      ROUND(potential_improvement_r, 1)
    ),
    format('Your %s trades continue %s%% of the time after hitting target, moving an average of %sR more. Based on %s recent trades, holding %s%% of your position could improve results by approximately %sR.',
      setup_name,
      ROUND(continuation_rate, 0),
      ROUND(avg_extra_r, 1),
      target_hit_trades,
      ROUND(recommended_hold_fraction * 100, 0),
      ROUND(potential_improvement_r, 1)
    ),
    format('When %s trade hits target: Close %s%%, hold %s%% with 1 ATR trailing stop. Track results separately to verify improvement.',
      setup_name,
      ROUND((1 - recommended_hold_fraction) * 100, 0),
      ROUND(recommended_hold_fraction * 100, 0)
    ),
    potential_improvement_r,
    jsonb_build_object(
      'setup_name', setup_name,
      'continuation_rate', continuation_rate,
      'avg_extra_r', avg_extra_r,
      'target_hit_trades', target_hit_trades,
      'recommended_hold_fraction', recommended_hold_fraction,
      'analysis_period', '60 days'
    ),
    now() + interval '30 days'
  FROM get_continuation_opportunities(p_user_id)
  WHERE potential_improvement_r >= 3.0; -- Only show significant opportunities

  GET DIAGNOSTICS recommendation_count = recommendation_count + ROW_COUNT;

  -- ============================================================
  -- 3. CONFIDENCE CALIBRATION RECOMMENDATIONS
  -- ============================================================
  INSERT INTO recommendations (
    user_id, category, priority, title, description, action, potential_impact, evidence, expires_at
  )
  SELECT 
    p_user_id,
    'confidence',
    CASE 
      WHEN calibration_flag = 'overconfident' THEN 'high'
      WHEN calibration_flag = 'underconfident' THEN 'medium'
      ELSE 'low'
    END,
    CASE 
      WHEN calibration_flag = 'well_calibrated' THEN format('Confidence Level %s: Well Calibrated ✓', confidence_level)
      WHEN calibration_flag = 'overconfident' THEN format('Confidence Level %s: Overconfident Warning', confidence_level)
      WHEN calibration_flag = 'underconfident' THEN format('Confidence Level %s: Trust Your Analysis More', confidence_level)
      ELSE format('Confidence Level %s: Review Calibration', confidence_level)
    END,
    CASE 
      WHEN calibration_flag = 'well_calibrated' 
        THEN format('Your confidence level %s trades perform well: %s%% win rate, %sR average across %s trades. Your self-assessment is accurate at this level.',
          confidence_level, ROUND(win_rate, 0), ROUND(avg_r, 2), trade_count)
      WHEN calibration_flag = 'overconfident'
        THEN format('Confidence level %s trades underperform expectations: %s%% win rate (expected 70%%+), %sR average (expected 2R+) across %s trades. You may be overestimating trade quality.',
          confidence_level, ROUND(win_rate, 0), ROUND(avg_r, 2), trade_count)
      WHEN calibration_flag = 'underconfident'
        THEN format('Confidence level %s trades outperform: %s%% win rate, %sR average across %s trades. This suggests you are being too conservative in your self-assessment.',
          confidence_level, ROUND(win_rate, 0), ROUND(avg_r, 2), trade_count)
      ELSE format('Confidence level %s: %s%% win rate, %sR average across %s trades.',
          confidence_level, ROUND(win_rate, 0), ROUND(avg_r, 2), trade_count)
    END,
    CASE 
      WHEN calibration_flag = 'well_calibrated' THEN 'Continue using confidence levels as-is. Your self-assessment is accurate.'
      WHEN calibration_flag = 'overconfident' THEN 'Reduce position size on high-confidence trades until calibration improves. Review pre-trade analysis criteria.'
      WHEN calibration_flag = 'underconfident' THEN 'Consider increasing position size on these trades. You are more skilled than you think at this confidence level.'
      ELSE 'Continue tracking confidence levels. More data needed for strong conclusions.'
    END,
    0, -- No direct R impact for calibration insights
    jsonb_build_object(
      'confidence_level', confidence_level,
      'trade_count', trade_count,
      'win_rate', win_rate,
      'avg_r', avg_r,
      'calibration_flag', calibration_flag,
      'analysis_period', '60 days'
    ),
    now() + interval '30 days'
  FROM get_confidence_calibration(p_user_id);

  GET DIAGNOSTICS recommendation_count = recommendation_count + ROW_COUNT;

  -- Return total count
  RETURN recommendation_count;
END;
$$;

COMMENT ON FUNCTION public.generate_recommendations IS 'Master function that generates all recommendation types for a user';

-- ============================================================
-- HELPER: Trigger to auto-generate recommendations
-- ============================================================
-- Optional: Auto-generate recommendations when trades are updated
-- (Can be run manually via UI button instead)

CREATE OR REPLACE FUNCTION public.trigger_generate_recommendations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only generate if it's been more than 1 day since last generation
  IF NOT EXISTS (
    SELECT 1 FROM recommendations 
    WHERE user_id = NEW.user_id 
      AND created_at > now() - interval '1 day'
    LIMIT 1
  ) THEN
    PERFORM generate_recommendations(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Optional trigger (commented out by default - enable if you want auto-generation)
-- CREATE TRIGGER trigger_recommendations_on_trade_close
--   AFTER UPDATE OF status ON trades
--   FOR EACH ROW
--   WHEN (NEW.status = 'closed' AND OLD.status != 'closed')
--   EXECUTE FUNCTION trigger_generate_recommendations();

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Test FOMO cost analysis
-- SELECT * FROM get_fomo_cost_analysis(auth.uid());

-- Test continuation opportunities
-- SELECT * FROM get_continuation_opportunities(auth.uid());

-- Test confidence calibration
-- SELECT * FROM get_confidence_calibration(auth.uid());

-- Generate all recommendations
-- SELECT generate_recommendations(auth.uid());

-- View active recommendations
-- SELECT * FROM recommendations WHERE user_id = auth.uid() AND status = 'active' ORDER BY priority, potential_impact DESC;

