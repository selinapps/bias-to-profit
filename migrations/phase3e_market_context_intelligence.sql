-- ============================================================
-- PHASE 3E: MARKET CONTEXT INTELLIGENCE
-- ============================================================
-- Purpose: Track HTF bias, VWAP, ATR, FVA, POI for edge refinement
-- Date: 2024-10-17
-- Version: v2.6.0
-- ============================================================

-- ============================================================
-- SCHEMA: Add market context fields to trades
-- ============================================================

-- HTF Bias Analysis
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS htf_bias text, -- 'Bullish', 'Bearish', 'Neutral'
ADD COLUMN IF NOT EXISTS htf_bias_tf text, -- 'D1', 'H4', 'H1' (timeframe source)
ADD COLUMN IF NOT EXISTS bias_aligned boolean; -- Auto: direction matches htf_bias

-- VWAP Context
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS vwap_type text, -- 'Session', 'Day', 'Week', 'Anchored'
ADD COLUMN IF NOT EXISTS vwap_band text, -- 'Below −3σ', '−3σ to −2σ', etc.
ADD COLUMN IF NOT EXISTS vwap_side text; -- 'Above', 'At', 'Below' (auto from band)

-- ATR Context (Volatility)
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS atr_tf text, -- 'M1', 'M5', 'M15', 'M30', 'H1'
ADD COLUMN IF NOT EXISTS atr_period integer, -- 5, 7, 10, 14, 20
ADD COLUMN IF NOT EXISTS atr_value_pips numeric, -- ATR value in pips
ADD COLUMN IF NOT EXISTS atr_units text, -- 'pips', 'ticks', 'points'
ADD COLUMN IF NOT EXISTS atr_bucket text; -- 'Low', 'Normal', 'High', 'Extreme' (auto from percentiles)

-- Fair Value Area (Profile Context)
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS profile_scope text, -- 'Session', 'Prior Day', 'Week', 'Composite (N)', 'Leg'
ADD COLUMN IF NOT EXISTS fva_position text, -- 'Below VAL', 'VAL to POC', 'At POC', 'POC to VAH', 'Above VAH'
ADD COLUMN IF NOT EXISTS inside_value boolean, -- Auto: true if between VAL-VAH
ADD COLUMN IF NOT EXISTS outside_value boolean; -- Auto: true if above VAH or below VAL

-- Point of Interest (POI) Type
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS poi_type text, -- See dropdown options below
ADD COLUMN IF NOT EXISTS poi_scope text; -- 'Intra-day', 'Prior Day', 'Weekly', 'Composite', 'Anchored Leg'

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_htf_bias ON public.trades(htf_bias);
CREATE INDEX IF NOT EXISTS idx_trades_bias_aligned ON public.trades(bias_aligned);
CREATE INDEX IF NOT EXISTS idx_trades_vwap_band ON public.trades(vwap_band);
CREATE INDEX IF NOT EXISTS idx_trades_fva_position ON public.trades(fva_position);
CREATE INDEX IF NOT EXISTS idx_trades_poi_type ON public.trades(poi_type);

-- Comments
COMMENT ON COLUMN public.trades.htf_bias IS 'Higher timeframe bias: Bullish, Bearish, or Neutral';
COMMENT ON COLUMN public.trades.bias_aligned IS 'Auto: true if direction matches HTF bias';
COMMENT ON COLUMN public.trades.vwap_band IS 'VWAP standard deviation band at entry';
COMMENT ON COLUMN public.trades.fva_position IS 'Position relative to Fair Value Area (VAL-POC-VAH)';
COMMENT ON COLUMN public.trades.poi_type IS 'Point of Interest type (Order Block, FVG, etc.)';

-- ============================================================
-- CONSTRAINTS (Optional - keeps data clean)
-- ============================================================

ALTER TABLE public.trades
DROP CONSTRAINT IF EXISTS chk_htf_bias,
DROP CONSTRAINT IF EXISTS chk_direction_value,
DROP CONSTRAINT IF EXISTS chk_vwap_type,
DROP CONSTRAINT IF EXISTS chk_vwap_band,
DROP CONSTRAINT IF EXISTS chk_vwap_side,
DROP CONSTRAINT IF EXISTS chk_fva_position,
DROP CONSTRAINT IF EXISTS chk_atr_tf,
DROP CONSTRAINT IF EXISTS chk_atr_units,
DROP CONSTRAINT IF EXISTS chk_atr_bucket,
DROP CONSTRAINT IF EXISTS chk_profile_scope,
DROP CONSTRAINT IF EXISTS chk_poi_scope;

ALTER TABLE public.trades
ADD CONSTRAINT chk_htf_bias 
  CHECK (htf_bias IS NULL OR htf_bias IN ('Bullish', 'Bearish', 'Neutral')),
ADD CONSTRAINT chk_direction_value 
  CHECK (direction IN ('long', 'short', 'Long', 'Short')),
ADD CONSTRAINT chk_vwap_type 
  CHECK (vwap_type IS NULL OR vwap_type IN ('Session', 'Day', 'Week', 'Anchored')),
ADD CONSTRAINT chk_vwap_band 
  CHECK (vwap_band IS NULL OR vwap_band IN ('Below −3σ', '−3σ to −2σ', '−2σ to −1σ', '−1σ to VWAP', 'At VWAP', 'VWAP to +1σ', '+1σ to +2σ', '+2σ to +3σ', 'Above +3σ')),
ADD CONSTRAINT chk_vwap_side 
  CHECK (vwap_side IS NULL OR vwap_side IN ('Above', 'At', 'Below')),
ADD CONSTRAINT chk_fva_position 
  CHECK (fva_position IS NULL OR fva_position IN ('Below VAL', 'VAL to POC', 'At POC', 'POC to VAH', 'Above VAH')),
ADD CONSTRAINT chk_atr_tf 
  CHECK (atr_tf IS NULL OR atr_tf IN ('M1', 'M5', 'M15', 'M30', 'H1')),
ADD CONSTRAINT chk_atr_units 
  CHECK (atr_units IS NULL OR atr_units IN ('pips', 'ticks', 'points')),
ADD CONSTRAINT chk_atr_bucket 
  CHECK (atr_bucket IS NULL OR atr_bucket IN ('Low', 'Normal', 'High', 'Extreme')),
ADD CONSTRAINT chk_profile_scope 
  CHECK (profile_scope IS NULL OR profile_scope IN ('Session', 'Prior Day', 'Week', 'Composite (N)', 'Leg')),
ADD CONSTRAINT chk_poi_scope 
  CHECK (poi_scope IS NULL OR poi_scope IN ('Intra-day', 'Prior Day', 'Weekly', 'Composite', 'Anchored Leg'));

-- ============================================================
-- TRIGGER: Auto-calculate bias_aligned, vwap_side, inside/outside_value
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_calculate_market_context()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Auto-calculate bias_aligned
  IF NEW.htf_bias IS NOT NULL AND NEW.direction IS NOT NULL THEN
    NEW.bias_aligned := (
      (LOWER(NEW.direction) = 'long' AND NEW.htf_bias = 'Bullish') OR
      (LOWER(NEW.direction) = 'short' AND NEW.htf_bias = 'Bearish')
    );
  END IF;

  -- Auto-calculate vwap_side from vwap_band
  IF NEW.vwap_band IS NOT NULL THEN
    NEW.vwap_side := CASE
      WHEN NEW.vwap_band = 'At VWAP' THEN 'At'
      WHEN NEW.vwap_band IN ('Below −3σ', '−3σ to −2σ', '−2σ to −1σ', '−1σ to VWAP') THEN 'Below'
      WHEN NEW.vwap_band IN ('VWAP to +1σ', '+1σ to +2σ', '+2σ to +3σ', 'Above +3σ') THEN 'Above'
      ELSE NULL
    END;
  END IF;

  -- Auto-calculate inside_value and outside_value from fva_position
  IF NEW.fva_position IS NOT NULL THEN
    NEW.inside_value := NEW.fva_position IN ('VAL to POC', 'At POC', 'POC to VAH');
    NEW.outside_value := NEW.fva_position IN ('Below VAL', 'Above VAH');
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_market_context ON public.trades;

-- Create trigger
CREATE TRIGGER trigger_auto_market_context
  BEFORE INSERT OR UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_market_context();

COMMENT ON FUNCTION public.auto_calculate_market_context IS 'Auto-calculates bias_aligned, vwap_side, inside_value, outside_value';

-- ============================================================
-- RPC 1: HTF Bias Alignment Impact
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_htf_bias_impact(p_user_id uuid)
RETURNS TABLE (
  htf_bias text,
  aligned_count bigint,
  not_aligned_count bigint,
  aligned_win_rate numeric,
  not_aligned_win_rate numeric,
  aligned_avg_r numeric,
  not_aligned_avg_r numeric,
  impact_difference numeric,
  total_impact_r numeric,
  recommendation text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH bias_stats AS (
    SELECT 
      t.htf_bias,
      -- Aligned trades
      COUNT(*) FILTER (WHERE t.bias_aligned = true) as aligned_trades,
      AVG(COALESCE(t.r_multiple, 0)) FILTER (WHERE t.bias_aligned = true) as avg_r_aligned,
      (COUNT(*) FILTER (WHERE t.bias_aligned = true AND COALESCE(t.r_multiple, 0) > 0)::numeric / 
       NULLIF(COUNT(*) FILTER (WHERE t.bias_aligned = true), 0) * 100) as wr_aligned,
      -- Not aligned trades
      COUNT(*) FILTER (WHERE t.bias_aligned = false) as not_aligned_trades,
      AVG(COALESCE(t.r_multiple, 0)) FILTER (WHERE t.bias_aligned = false) as avg_r_not_aligned,
      (COUNT(*) FILTER (WHERE t.bias_aligned = false AND COALESCE(t.r_multiple, 0) > 0)::numeric / 
       NULLIF(COUNT(*) FILTER (WHERE t.bias_aligned = false), 0) * 100) as wr_not_aligned
    FROM trades t
    WHERE t.user_id = p_user_id
      AND t.status = 'closed'
      AND t.htf_bias IS NOT NULL
      AND t.bias_aligned IS NOT NULL
      AND t.created_at > now() - interval '90 days'
    GROUP BY t.htf_bias
  )
  SELECT 
    bs.htf_bias,
    bs.aligned_trades,
    bs.not_aligned_trades,
    COALESCE(bs.wr_aligned, 0),
    COALESCE(bs.wr_not_aligned, 0),
    COALESCE(bs.avg_r_aligned, 0),
    COALESCE(bs.avg_r_not_aligned, 0),
    (COALESCE(bs.avg_r_aligned, 0) - COALESCE(bs.avg_r_not_aligned, 0)) as impact_diff,
    ((COALESCE(bs.avg_r_aligned, 0) - COALESCE(bs.avg_r_not_aligned, 0)) * bs.not_aligned_trades) as total_impact,
    CASE 
      WHEN (COALESCE(bs.avg_r_aligned, 0) - COALESCE(bs.avg_r_not_aligned, 0)) >= 2.0 
        THEN 'ALWAYS trade with HTF bias - huge edge'
      WHEN (COALESCE(bs.avg_r_aligned, 0) - COALESCE(bs.avg_r_not_aligned, 0)) >= 1.0 
        THEN 'Prefer trading with HTF bias - significant edge'
      WHEN (COALESCE(bs.avg_r_aligned, 0) - COALESCE(bs.avg_r_not_aligned, 0)) >= 0.5 
        THEN 'Trading with HTF bias helps - minor edge'
      ELSE 'HTF bias alignment has minimal impact'
    END as recommendation
  FROM bias_stats bs
  WHERE bs.not_aligned_trades >= 3 -- Need at least 3 counter-bias trades
  ORDER BY total_impact DESC;
END;
$$;

COMMENT ON FUNCTION public.get_htf_bias_impact IS 'Analyzes performance when trading with vs against HTF bias';

-- ============================================================
-- RPC 2: VWAP Performance Analysis
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_vwap_performance(p_user_id uuid)
RETURNS TABLE (
  vwap_band text,
  trade_count bigint,
  win_rate numeric,
  avg_r numeric,
  best_band boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH vwap_stats AS (
    SELECT 
      vwap_band as band,
      COUNT(*) as trades,
      AVG(COALESCE(r_multiple, 0)) as average_r,
      (COUNT(*) FILTER (WHERE COALESCE(r_multiple, 0) > 0)::numeric / NULLIF(COUNT(*), 0) * 100) as win_pct
    FROM trades
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND vwap_band IS NOT NULL
      AND created_at > now() - interval '90 days'
    GROUP BY vwap_band
    HAVING COUNT(*) >= 3
  ),
  best AS (
    SELECT MAX(average_r) as best_avg_r FROM vwap_stats
  )
  SELECT 
    vs.band,
    vs.trades,
    vs.win_pct,
    vs.average_r,
    (vs.average_r = (SELECT best_avg_r FROM best)) as best_band
  FROM vwap_stats vs
  ORDER BY vs.average_r DESC;
END;
$$;

COMMENT ON FUNCTION public.get_vwap_performance IS 'Performance breakdown by VWAP band position';

-- ============================================================
-- RPC 3: FVA Performance Analysis
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_fva_performance(p_user_id uuid)
RETURNS TABLE (
  fva_position text,
  trade_count bigint,
  win_rate numeric,
  avg_r numeric,
  best_zone boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH fva_stats AS (
    SELECT 
      fva_position as position,
      COUNT(*) as trades,
      AVG(COALESCE(r_multiple, 0)) as average_r,
      (COUNT(*) FILTER (WHERE COALESCE(r_multiple, 0) > 0)::numeric / NULLIF(COUNT(*), 0) * 100) as win_pct
    FROM trades
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND fva_position IS NOT NULL
      AND created_at > now() - interval '90 days'
    GROUP BY fva_position
    HAVING COUNT(*) >= 3
  ),
  best AS (
    SELECT MAX(average_r) as best_avg_r FROM fva_stats
  )
  SELECT 
    fs.position,
    fs.trades,
    fs.win_pct,
    fs.average_r,
    (fs.average_r = (SELECT best_avg_r FROM best)) as best_zone
  FROM fva_stats fs
  ORDER BY fs.average_r DESC;
END;
$$;

COMMENT ON FUNCTION public.get_fva_performance IS 'Performance breakdown by Fair Value Area position';

-- ============================================================
-- RPC 4: POI Type Performance Analysis
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_poi_performance(p_user_id uuid)
RETURNS TABLE (
  poi_type text,
  trade_count bigint,
  win_rate numeric,
  avg_r numeric,
  best_poi boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH poi_stats AS (
    SELECT 
      poi_type as poi,
      COUNT(*) as trades,
      AVG(COALESCE(r_multiple, 0)) as average_r,
      (COUNT(*) FILTER (WHERE COALESCE(r_multiple, 0) > 0)::numeric / NULLIF(COUNT(*), 0) * 100) as win_pct
    FROM trades
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND poi_type IS NOT NULL
      AND created_at > now() - interval '90 days'
    GROUP BY poi_type
    HAVING COUNT(*) >= 3
  ),
  best AS (
    SELECT MAX(average_r) as best_avg_r FROM poi_stats
  )
  SELECT 
    ps.poi,
    ps.trades,
    ps.win_pct,
    ps.average_r,
    (ps.average_r = (SELECT best_avg_r FROM best)) as best_poi
  FROM poi_stats ps
  ORDER BY ps.average_r DESC;
END;
$$;

COMMENT ON FUNCTION public.get_poi_performance IS 'Performance breakdown by Point of Interest type';

-- ============================================================
-- RPC 5: Market Context Recommendations Generator
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_market_context_recommendations(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recommendation_count integer := 0;
  rows_inserted integer := 0;
BEGIN
  -- HTF Bias Alignment Recommendations
  INSERT INTO recommendations (
    user_id, category, priority, title, description, action, potential_impact, evidence, expires_at
  )
  SELECT 
    p_user_id,
    'market_context'::text,
    CASE 
      WHEN total_impact_r >= 5 THEN 'critical'
      WHEN total_impact_r >= 2 THEN 'high'
      ELSE 'medium'
    END::text,
    format('Trading Against %s HTF Bias Costs You %sR', htf_bias, ROUND(ABS(total_impact_r), 1)),
    format('Last 90 days: Aligned with %s bias: %s trades, %s%% win rate, %sR avg. NOT aligned: %s trades, %s%% win rate, %sR avg. Impact: %sR per trade × %s trades = %sR total cost.',
      htf_bias,
      aligned_count, ROUND(aligned_win_rate, 0), ROUND(aligned_avg_r, 2),
      not_aligned_count, ROUND(not_aligned_win_rate, 0), ROUND(not_aligned_avg_r, 2),
      ROUND(ABS(impact_difference), 2), not_aligned_count, ROUND(ABS(total_impact_r), 1)
    ),
    recommendation::text,
    total_impact_r,
    jsonb_build_object(
      'htf_bias', htf_bias,
      'aligned_count', aligned_count,
      'not_aligned_count', not_aligned_count,
      'aligned_win_rate', aligned_win_rate,
      'not_aligned_win_rate', not_aligned_win_rate,
      'aligned_avg_r', aligned_avg_r,
      'not_aligned_avg_r', not_aligned_avg_r,
      'impact_per_trade', impact_difference,
      'period', '90 days'
    ),
    now() + interval '30 days'
  FROM get_htf_bias_impact(p_user_id)
  WHERE total_impact_r >= 1.5;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  recommendation_count := rows_inserted;

  -- VWAP Band Recommendations (if significant difference found)
  WITH best_vwap AS (
    SELECT * FROM get_vwap_performance(p_user_id) WHERE best_band = true LIMIT 1
  ),
  worst_vwap AS (
    SELECT * FROM get_vwap_performance(p_user_id) ORDER BY avg_r ASC LIMIT 1
  )
  INSERT INTO recommendations (
    user_id, category, priority, title, description, action, potential_impact, evidence, expires_at
  )
  SELECT 
    p_user_id,
    'market_context'::text,
    CASE 
      WHEN (b.avg_r - w.avg_r) >= 2.0 THEN 'high'
      WHEN (b.avg_r - w.avg_r) >= 1.0 THEN 'medium'
      ELSE 'low'
    END::text,
    format('Entries at "%s" Outperform "%s" by %sR', b.vwap_band, w.vwap_band, ROUND(b.avg_r - w.avg_r, 1)),
    format('Best VWAP zone: "%s" (%s trades, %s%% win, %sR avg). Worst: "%s" (%s trades, %s%% win, %sR avg). Focus entries in optimal zones.',
      b.vwap_band, b.trade_count, ROUND(b.win_rate, 0), ROUND(b.avg_r, 2),
      w.vwap_band, w.trade_count, ROUND(w.win_rate, 0), ROUND(w.avg_r, 2)
    ),
    format('Target entries at "%s". Avoid "%s" unless high-conviction setup.', b.vwap_band, w.vwap_band)::text,
    ((b.avg_r - w.avg_r) * w.trade_count)::numeric,
    jsonb_build_object(
      'best_band', b.vwap_band,
      'best_avg_r', b.avg_r,
      'worst_band', w.vwap_band,
      'worst_avg_r', w.avg_r,
      'difference', (b.avg_r - w.avg_r),
      'period', '90 days'
    ),
    now() + interval '30 days'
  FROM best_vwap b, worst_vwap w
  WHERE (b.avg_r - w.avg_r) >= 1.0 AND b.trade_count >= 3 AND w.trade_count >= 3;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  recommendation_count := recommendation_count + rows_inserted;

  -- FVA Performance Recommendations
  WITH best_fva AS (
    SELECT * FROM get_fva_performance(p_user_id) WHERE best_zone = true LIMIT 1
  )
  INSERT INTO recommendations (
    user_id, category, priority, title, description, action, potential_impact, evidence, expires_at
  )
  SELECT 
    p_user_id,
    'market_context'::text,
    'medium'::text,
    format('"%s" Is Your Best Fair Value Zone', fva_position),
    format('Entries at "%s": %s trades, %s%% win rate, %sR average. This is your optimal fair value entry zone.',
      fva_position, trade_count, ROUND(win_rate, 0), ROUND(avg_r, 2)
    ),
    format('Focus entries when price is at "%s" position in value area.', fva_position)::text,
    0::numeric,
    jsonb_build_object(
      'best_fva', fva_position,
      'trade_count', trade_count,
      'win_rate', win_rate,
      'avg_r', avg_r,
      'period', '90 days'
    ),
    now() + interval '30 days'
  FROM best_fva
  WHERE trade_count >= 5;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  recommendation_count := recommendation_count + rows_inserted;

  -- POI Type Recommendations
  WITH best_poi AS (
    SELECT * FROM get_poi_performance(p_user_id) WHERE best_poi = true LIMIT 1
  ),
  worst_poi AS (
    SELECT * FROM get_poi_performance(p_user_id) ORDER BY avg_r ASC LIMIT 1
  )
  INSERT INTO recommendations (
    user_id, category, priority, title, description, action, potential_impact, evidence, expires_at
  )
  SELECT 
    p_user_id,
    'market_context'::text,
    'medium'::text,
    format('"%s" POIs Outperform "%s" by %sR', b.poi_type, w.poi_type, ROUND(b.avg_r - w.avg_r, 1)),
    format('Best POI: "%s" (%s trades, %s%% win, %sR avg). Worst: "%s" (%s trades, %s%% win, %sR avg).',
      b.poi_type, b.trade_count, ROUND(b.win_rate, 0), ROUND(b.avg_r, 2),
      w.poi_type, w.trade_count, ROUND(w.win_rate, 0), ROUND(w.avg_r, 2)
    ),
    format('Focus on "%s" POIs. Reduce trading "%s" unless high conviction.', b.poi_type, w.poi_type)::text,
    ((b.avg_r - w.avg_r) * w.trade_count)::numeric,
    jsonb_build_object(
      'best_poi', b.poi_type,
      'worst_poi', w.poi_type,
      'difference', (b.avg_r - w.avg_r),
      'period', '90 days'
    ),
    now() + interval '30 days'
  FROM best_poi b, worst_poi w
  WHERE (b.avg_r - w.avg_r) >= 0.8 AND b.trade_count >= 3 AND w.trade_count >= 3;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  recommendation_count := recommendation_count + rows_inserted;

  RETURN recommendation_count;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error generating market context recommendations: %', SQLERRM;
  RETURN 0;
END;
$$;

COMMENT ON FUNCTION public.generate_market_context_recommendations IS 'Generates recommendations based on HTF bias, VWAP, FVA, POI analysis';

-- ============================================================
-- UPDATE: Add market context to master generator
-- ============================================================

-- This will be updated in the master generate_recommendations() function
-- to call generate_market_context_recommendations() as the 5th detector

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Test HTF bias impact
-- SELECT * FROM get_htf_bias_impact(auth.uid());

-- Test VWAP performance
-- SELECT * FROM get_vwap_performance(auth.uid());

-- Test FVA performance
-- SELECT * FROM get_fva_performance(auth.uid());

-- Test POI performance
-- SELECT * FROM get_poi_performance(auth.uid());

-- Generate market context recommendations
-- SELECT generate_market_context_recommendations(auth.uid());

