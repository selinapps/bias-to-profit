-- ============================================================
-- PHASE 2B: Analytics Views & Helper Functions
-- ============================================================
-- Purpose: Create views and RPCs for advanced analytics dashboard
-- Date: 2024-10-16
-- ============================================================

-- ============================================================
-- VIEW 1: v_trades_analytics
-- ============================================================
-- One row per trade with safe derived metrics (null-safe efficiency)

CREATE OR REPLACE VIEW public.v_trades_analytics AS
SELECT
  t.*,
  -- Safe efficiency calculation (never divide by zero)
  CASE
    WHEN t.mfe_r IS NULL OR t.mfe_r <= 0 THEN NULL
    ELSE LEAST(1.0, ABS(t.r_multiple / t.mfe_r))
  END as efficiency_safe,
  -- Risk efficiency (R captured per unit of adverse movement)
  CASE
    WHEN t.mae_r IS NULL OR t.mae_r = 0 THEN NULL
    ELSE ABS(t.r_multiple / t.mae_r)
  END as risk_efficiency,
  -- Capture quality (how close to theoretical max)
  CASE
    WHEN t.mfe_r IS NULL OR t.mfe_r <= 0 THEN NULL
    WHEN t.r_multiple IS NULL THEN NULL
    ELSE (t.r_multiple / t.mfe_r) * 100  -- As percentage
  END as capture_percentage
FROM public.trades t;

-- Set security invoker to respect RLS
ALTER VIEW public.v_trades_analytics SET (security_invoker = true);

COMMENT ON VIEW public.v_trades_analytics IS 'Trades with safe calculated metrics (null-safe efficiency, risk efficiency, capture %)';

-- ============================================================
-- VIEW 2: v_trade_observations (Updated from Phase 2)
-- ============================================================
-- Trades joined with observations + insight labels

CREATE OR REPLACE VIEW public.v_trade_observations AS
SELECT
  -- Trade data
  t.id as trade_id,
  t.user_id,
  t.asset,
  t.setup_name,
  t.session,
  t.direction,
  t.entry_time,
  t.exit_time,
  t.entry_price,
  t.stop_loss,
  t.exit_price,
  t.target_price,
  t.pnl,
  t.r_multiple,
  t.risk_amount,
  t.exit_reason,
  t.moved_to_be,
  t.be_trigger_r,
  t.efficiency,
  t.mae_r,
  t.mfe_r,
  t.confidence,
  t.discipline_tag,
  
  -- Observation data
  o.id as observation_id,
  o.observation_type,
  o.observation_time,
  o.observed_at,
  o.price_action,
  o.peak_price,
  o.pips_moved,
  o.r_moved,
  o.notes as observation_notes,
  
  -- Calculated insight label
  CASE
    WHEN o.observation_type = 'post_stop' AND o.price_action = 'reversal' THEN 'Good Stop Placement'
    WHEN o.observation_type = 'post_stop' AND o.price_action = 'continuation' THEN 'Stop Was Correct'
    WHEN o.observation_type = 'post_target' AND o.price_action = 'continuation' THEN 'Left R on Table'
    WHEN o.observation_type = 'post_target' AND o.price_action = 'reversal' THEN 'Good Exit Timing'
    WHEN o.observation_type = 'post_target' AND o.price_action = 'consolidation' THEN 'Optimal Exit'
    WHEN o.observation_type = 'post_stop' AND o.price_action = 'consolidation' THEN 'Neutral Stop'
    ELSE 'Unclear'
  END as observation_insight
  
FROM public.trades t
JOIN public.post_trade_observations o ON t.id = o.trade_id
WHERE t.status = 'closed';

-- Set security invoker to respect RLS
ALTER VIEW public.v_trade_observations SET (security_invoker = true);

COMMENT ON VIEW public.v_trade_observations IS 'Trades joined with observations + auto-generated insight labels';

-- ============================================================
-- FUNCTION 1: get_observation_summary
-- ============================================================
-- Returns overall observation statistics for user

CREATE OR REPLACE FUNCTION public.get_observation_summary(p_user_id uuid)
RETURNS TABLE (
  total_observations bigint,
  trades_observed bigint,
  avg_r_moved numeric,
  continuations bigint,
  reversals bigint,
  consolidations bigint,
  post_stop_count bigint,
  post_target_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_observations,
    COUNT(DISTINCT trade_id)::bigint as trades_observed,
    ROUND(AVG(r_moved)::numeric, 3) as avg_r_moved,
    COUNT(*) FILTER (WHERE price_action = 'continuation')::bigint as continuations,
    COUNT(*) FILTER (WHERE price_action = 'reversal')::bigint as reversals,
    COUNT(*) FILTER (WHERE price_action = 'consolidation')::bigint as consolidations,
    COUNT(*) FILTER (WHERE observation_type = 'post_stop')::bigint as post_stop_count,
    COUNT(*) FILTER (WHERE observation_type = 'post_target')::bigint as post_target_count
  FROM post_trade_observations
  WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.get_observation_summary IS 'Get overall observation statistics for user';

-- ============================================================
-- FUNCTION 2: get_continuation_by_setup
-- ============================================================
-- Continuation rate and extra R by setup (after target hit)

CREATE OR REPLACE FUNCTION public.get_continuation_by_setup(p_user_id uuid)
RETURNS TABLE (
  setup_name text,
  target_hit_trades bigint,
  continuations bigint,
  continuation_rate numeric,
  avg_extra_r numeric,
  total_missed_r numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.setup_name,
    COUNT(*)::bigint as target_hit_trades,
    COUNT(*) FILTER (WHERE o.price_action = 'continuation')::bigint as continuations,
    ROUND((COUNT(*) FILTER (WHERE o.price_action = 'continuation')::numeric / NULLIF(COUNT(*), 0) * 100), 1) as continuation_rate,
    ROUND(AVG(o.r_moved) FILTER (WHERE o.price_action = 'continuation'), 3) as avg_extra_r,
    ROUND(SUM(o.r_moved) FILTER (WHERE o.price_action = 'continuation'), 2) as total_missed_r
  FROM trades t
  JOIN post_trade_observations o ON t.id = o.trade_id
  WHERE t.user_id = p_user_id
    AND o.observation_type = 'post_target'
    AND t.status = 'closed'
    AND t.r_multiple > 0  -- Winning trades only
  GROUP BY t.setup_name
  ORDER BY continuation_rate DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.get_continuation_by_setup IS 'Continuation rate after target hit, grouped by setup';

-- ============================================================
-- FUNCTION 3: get_reversal_after_stop_by_setup
-- ============================================================
-- Reversal rate after stop hit (stop quality) by setup

CREATE OR REPLACE FUNCTION public.get_reversal_after_stop_by_setup(p_user_id uuid)
RETURNS TABLE (
  setup_name text,
  stopped_trades bigint,
  reversals bigint,
  reversal_rate numeric,
  avg_r_saved numeric,
  stop_quality_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.setup_name,
    COUNT(*)::bigint as stopped_trades,
    COUNT(*) FILTER (WHERE o.price_action = 'reversal')::bigint as reversals,
    ROUND((COUNT(*) FILTER (WHERE o.price_action = 'reversal')::numeric / NULLIF(COUNT(*), 0) * 100), 1) as reversal_rate,
    ROUND(AVG(o.r_moved) FILTER (WHERE o.price_action = 'reversal'), 3) as avg_r_saved,
    -- Stop quality: 0-100 (100 = all stops reversed, perfect placement)
    ROUND((COUNT(*) FILTER (WHERE o.price_action = 'reversal')::numeric / NULLIF(COUNT(*), 0) * 100), 1) as stop_quality_score
  FROM trades t
  JOIN post_trade_observations o ON t.id = o.trade_id
  WHERE t.user_id = p_user_id
    AND o.observation_type = 'post_stop'
    AND t.status = 'closed'
  GROUP BY t.setup_name
  ORDER BY stop_quality_score DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.get_reversal_after_stop_by_setup IS 'Stop placement quality by setup (reversal rate after stop)';

-- ============================================================
-- FUNCTION 4: get_optimal_observation_window
-- ============================================================
-- Which observation checkpoint captures most movement

CREATE OR REPLACE FUNCTION public.get_optimal_observation_window(p_user_id uuid)
RETURNS TABLE (
  observation_time text,
  observation_count bigint,
  avg_r_moved numeric,
  avg_continuation_r numeric,
  avg_reversal_r numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.observation_time,
    COUNT(*)::bigint as observation_count,
    ROUND(AVG(ABS(o.r_moved))::numeric, 3) as avg_r_moved,
    ROUND(AVG(o.r_moved) FILTER (WHERE o.price_action = 'continuation'), 3) as avg_continuation_r,
    ROUND(AVG(ABS(o.r_moved)) FILTER (WHERE o.price_action = 'reversal'), 3) as avg_reversal_r
  FROM post_trade_observations o
  WHERE o.user_id = p_user_id
  GROUP BY o.observation_time
  ORDER BY
    CASE o.observation_time
      WHEN '15m' THEN 1
      WHEN '1h' THEN 2
      WHEN '4h' THEN 3
      WHEN 'EOD' THEN 4
      WHEN 'next_day' THEN 5
      ELSE 6
    END;
END;
$$;

COMMENT ON FUNCTION public.get_optimal_observation_window IS 'Optimal observation checkpoint analysis';

-- ============================================================
-- FUNCTION 5: get_exit_quality_by_setup
-- ============================================================
-- Combined efficiency + missed R analysis by setup

CREATE OR REPLACE FUNCTION public.get_exit_quality_by_setup(p_user_id uuid)
RETURNS TABLE (
  setup_name text,
  trade_count bigint,
  avg_efficiency numeric,
  avg_captured_r numeric,
  avg_missed_r numeric,
  exit_quality_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.setup_name,
    COUNT(DISTINCT t.id)::bigint as trade_count,
    ROUND(AVG(t.efficiency)::numeric, 3) as avg_efficiency,
    ROUND(AVG(t.r_multiple)::numeric, 3) as avg_captured_r,
    ROUND(AVG(o.r_moved) FILTER (WHERE o.observation_type = 'post_target' AND o.price_action = 'continuation' AND o.r_moved > 0), 3) as avg_missed_r,
    -- Exit quality: efficiency / (efficiency + missed_r_rate)
    -- Represents: % of optimal R you're capturing
    CASE
      WHEN AVG(t.efficiency) IS NULL THEN NULL
      WHEN AVG(o.r_moved) FILTER (WHERE o.observation_type = 'post_target' AND o.price_action = 'continuation') IS NULL THEN 
        ROUND(AVG(t.efficiency)::numeric * 100, 1)
      ELSE
        ROUND((AVG(t.efficiency) / NULLIF(AVG(t.efficiency) + AVG(o.r_moved) FILTER (WHERE o.observation_type = 'post_target' AND o.price_action = 'continuation'), 0)) * 100, 1)
    END as exit_quality_score
  FROM trades t
  LEFT JOIN post_trade_observations o ON t.id = o.trade_id
  WHERE t.user_id = p_user_id
    AND t.status = 'closed'
    AND t.setup_name IS NOT NULL
  GROUP BY t.setup_name
  HAVING COUNT(DISTINCT t.id) >= 3  -- Minimum 3 trades
  ORDER BY exit_quality_score DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.get_exit_quality_by_setup IS 'Exit quality score combining efficiency and missed R';

-- ============================================================
-- FUNCTION 6: get_missed_r_timeline
-- ============================================================
-- Timeline of missed R (cumulative and by day)

CREATE OR REPLACE FUNCTION public.get_missed_r_timeline(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE (
  trade_date date,
  daily_missed_r numeric,
  cumulative_missed_r numeric,
  trades_with_continuation bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH daily_missed AS (
    SELECT
      DATE(t.exit_time) as trade_date,
      SUM(o.r_moved) FILTER (WHERE o.observation_type = 'post_target' AND o.price_action = 'continuation' AND o.r_moved > 0) as daily_r,
      COUNT(*) FILTER (WHERE o.observation_type = 'post_target' AND o.price_action = 'continuation' AND o.r_moved > 0)::bigint as continuation_count
    FROM trades t
    JOIN post_trade_observations o ON t.id = o.trade_id
    WHERE t.user_id = p_user_id
      AND t.exit_time >= CURRENT_DATE - (p_days || ' days')::interval
    GROUP BY DATE(t.exit_time)
  )
  SELECT
    dm.trade_date,
    ROUND(COALESCE(dm.daily_r, 0)::numeric, 2) as daily_missed_r,
    ROUND(SUM(COALESCE(dm.daily_r, 0)) OVER (ORDER BY dm.trade_date)::numeric, 2) as cumulative_missed_r,
    dm.continuation_count as trades_with_continuation
  FROM daily_missed dm
  ORDER BY dm.trade_date DESC;
END;
$$;

COMMENT ON FUNCTION public.get_missed_r_timeline IS 'Daily and cumulative missed R from post-target continuations';

-- ============================================================
-- FUNCTION 7: get_confidence_performance
-- ============================================================
-- Performance metrics by confidence level

CREATE OR REPLACE FUNCTION public.get_confidence_performance(p_user_id uuid)
RETURNS TABLE (
  confidence_level integer,
  trade_count bigint,
  avg_r_multiple numeric,
  avg_efficiency numeric,
  win_rate numeric,
  avg_pnl numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.confidence as confidence_level,
    COUNT(*)::bigint as trade_count,
    ROUND(AVG(t.r_multiple)::numeric, 3) as avg_r_multiple,
    ROUND(AVG(t.efficiency)::numeric, 3) as avg_efficiency,
    ROUND((COUNT(*) FILTER (WHERE t.r_multiple > 0)::numeric / NULLIF(COUNT(*), 0) * 100), 1) as win_rate,
    ROUND(AVG(t.pnl)::numeric, 2) as avg_pnl
  FROM trades t
  WHERE t.user_id = p_user_id
    AND t.status = 'closed'
    AND t.confidence IS NOT NULL
  GROUP BY t.confidence
  ORDER BY t.confidence;
END;
$$;

COMMENT ON FUNCTION public.get_confidence_performance IS 'Trading performance by confidence level (1-5)';

-- ============================================================
-- FUNCTION 8: get_discipline_performance
-- ============================================================
-- Performance metrics by discipline tag

CREATE OR REPLACE FUNCTION public.get_discipline_performance(p_user_id uuid)
RETURNS TABLE (
  discipline_tag text,
  trade_count bigint,
  avg_r_multiple numeric,
  avg_efficiency numeric,
  win_rate numeric,
  avg_pnl numeric,
  avg_missed_r numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.discipline_tag,
    COUNT(DISTINCT t.id)::bigint as trade_count,
    ROUND(AVG(t.r_multiple)::numeric, 3) as avg_r_multiple,
    ROUND(AVG(t.efficiency)::numeric, 3) as avg_efficiency,
    ROUND((COUNT(*) FILTER (WHERE t.r_multiple > 0)::numeric / NULLIF(COUNT(DISTINCT t.id), 0) * 100), 1) as win_rate,
    ROUND(AVG(t.pnl)::numeric, 2) as avg_pnl,
    ROUND(AVG(o.r_moved) FILTER (WHERE o.observation_type = 'post_target' AND o.price_action = 'continuation'), 3) as avg_missed_r
  FROM trades t
  LEFT JOIN post_trade_observations o ON t.id = o.trade_id
  WHERE t.user_id = p_user_id
    AND t.status = 'closed'
    AND t.discipline_tag IS NOT NULL
  GROUP BY t.discipline_tag
  ORDER BY avg_r_multiple DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.get_discipline_performance IS 'Trading performance by discipline tag';

-- ============================================================
-- FUNCTION 9: get_efficiency_by_setup
-- ============================================================
-- Efficiency metrics grouped by setup

CREATE OR REPLACE FUNCTION public.get_efficiency_by_setup(p_user_id uuid)
RETURNS TABLE (
  setup_name text,
  trade_count bigint,
  avg_efficiency numeric,
  avg_mae_r numeric,
  avg_mfe_r numeric,
  avg_r_multiple numeric,
  trades_with_efficiency bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.setup_name,
    COUNT(*)::bigint as trade_count,
    ROUND(AVG(t.efficiency)::numeric, 3) as avg_efficiency,
    ROUND(AVG(t.mae_r)::numeric, 3) as avg_mae_r,
    ROUND(AVG(t.mfe_r)::numeric, 3) as avg_mfe_r,
    ROUND(AVG(t.r_multiple)::numeric, 3) as avg_r_multiple,
    COUNT(*) FILTER (WHERE t.efficiency IS NOT NULL)::bigint as trades_with_efficiency
  FROM trades t
  WHERE t.user_id = p_user_id
    AND t.status = 'closed'
    AND t.setup_name IS NOT NULL
  GROUP BY t.setup_name
  HAVING COUNT(*) >= 3  -- Minimum 3 trades
  ORDER BY avg_efficiency DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.get_efficiency_by_setup IS 'Execution efficiency metrics by setup';

-- ============================================================
-- Verification Queries
-- ============================================================

-- Test v_trades_analytics
SELECT id, setup_name, r_multiple, mfe_r, efficiency, efficiency_safe, risk_efficiency
FROM v_trades_analytics
WHERE user_id = auth.uid()
LIMIT 5;

-- Test v_trade_observations  
SELECT trade_id, setup_name, observation_type, price_action, r_moved, observation_insight
FROM v_trade_observations
WHERE user_id = auth.uid()
LIMIT 5;

-- Test functions work with no data
SELECT * FROM get_observation_summary(auth.uid());
SELECT * FROM get_continuation_by_setup(auth.uid());
SELECT * FROM get_reversal_after_stop_by_setup(auth.uid());
SELECT * FROM get_optimal_observation_window(auth.uid());
SELECT * FROM get_exit_quality_by_setup(auth.uid());
SELECT * FROM get_confidence_performance(auth.uid());
SELECT * FROM get_discipline_performance(auth.uid());
SELECT * FROM get_efficiency_by_setup(auth.uid());
SELECT * FROM get_missed_r_timeline(auth.uid(), 30);

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

