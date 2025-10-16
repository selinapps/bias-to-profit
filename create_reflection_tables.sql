-- Daily Reflection Tab Database Schema
-- This script creates the necessary tables for the reflection feature

-- 1. Create daily_reflection table for aggregated daily insights
CREATE TABLE IF NOT EXISTS public.daily_reflection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reflection_date date NOT NULL,
  
  -- Auto-calculated metrics from trades
  total_trades integer DEFAULT 0,
  net_r_multiple decimal(8,3) DEFAULT 0,
  net_pnl decimal(10,2) DEFAULT 0,
  
  -- Emotional and psychological metrics
  avg_emotional_score decimal(3,2), -- 1-5 scale
  emotional_stability_score decimal(3,2), -- calculated from variance
  
  -- Performance metrics
  plan_adherence_percentage decimal(5,2) DEFAULT 0, -- % of trades with full checklist
  bias_accuracy_percentage decimal(5,2) DEFAULT 0, -- % of trades matching bias
  session_discipline_percentage decimal(5,2) DEFAULT 0, -- % of trades in correct session
  
  -- Reflection insights
  top_mistakes text[], -- most common mistake tags
  improvement_areas text[], -- areas for improvement
  positive_actions text[], -- good actions taken
  
  -- Manual reflection notes
  daily_notes text,
  key_learnings text,
  tomorrow_focus text,
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Ensure one reflection per user per day
  UNIQUE(user_id, reflection_date)
);

-- 2. Create trade_reflection table for individual trade reflections
CREATE TABLE IF NOT EXISTS public.trade_reflection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  
  -- Emotional assessment (1-5 scale)
  emotional_rating integer CHECK (emotional_rating >= 1 AND emotional_rating <= 5),
  emotional_tags text[], -- [calm, stressed, focused, distracted, confident, fearful]
  
  -- Execution analysis
  execution_quality integer CHECK (execution_quality >= 1 AND execution_quality <= 5),
  checklist_completion_percentage decimal(5,2), -- % of checklist items completed
  
  -- Reflection fields
  why_took_trade text,
  execution_flaws text,
  improvement_ideas text,
  what_went_well text,
  
  -- Bias and session analysis
  bias_match boolean, -- did trade align with daily bias
  session_appropriate boolean, -- was trade taken in appropriate session
  
  -- Screenshot and visual analysis
  screenshot_analysis text,
  chart_pattern_recognition text,
  
  -- Learning outcomes
  key_takeaways text[],
  mistakes_to_avoid text[],
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Ensure one reflection per trade
  UNIQUE(trade_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_reflection_user_date ON public.daily_reflection(user_id, reflection_date DESC);
CREATE INDEX IF NOT EXISTS idx_trade_reflection_user_trade ON public.trade_reflection(user_id, trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_reflection_created_at ON public.trade_reflection(created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.daily_reflection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_reflection ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (drop existing first to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage their own daily reflections" ON public.daily_reflection;
DROP POLICY IF EXISTS "Users can manage their own trade reflections" ON public.trade_reflection;

CREATE POLICY "Users can manage their own daily reflections" ON public.daily_reflection 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own trade reflections" ON public.trade_reflection 
  FOR ALL USING (auth.uid() = user_id);

-- 6. Create function to auto-generate daily reflection from trades
CREATE OR REPLACE FUNCTION generate_daily_reflection(
  p_user_id uuid,
  p_reflection_date date DEFAULT CURRENT_DATE
) RETURNS public.daily_reflection AS $$
DECLARE
  v_reflection public.daily_reflection;
  v_trade_stats RECORD;
  v_emotional_avg decimal;
  v_plan_adherence decimal;
  v_bias_accuracy decimal;
  v_session_discipline decimal;
  v_top_mistakes text[];
  v_positive_actions text[];
BEGIN
  -- Get trade statistics for the day
  SELECT 
    COUNT(*) as total_trades,
    COALESCE(SUM(r_multiple), 0) as net_r_multiple,
    COALESCE(SUM(pnl), 0) as net_pnl,
    COALESCE(AVG((emotions->>'calm_stressed')::decimal), 0) as avg_emotional,
    COALESCE(
      (COUNT(*) FILTER (WHERE mistake_tags = '{}' OR mistake_tags IS NULL) * 100.0 / COUNT(*)), 
      0
    ) as plan_adherence,
    COALESCE(
      (COUNT(*) FILTER (WHERE bias_match = true) * 100.0 / COUNT(*)), 
      0
    ) as bias_accuracy,
    COALESCE(
      (COUNT(*) FILTER (WHERE session_appropriate = true) * 100.0 / COUNT(*)), 
      0
    ) as session_discipline
  INTO v_trade_stats
  FROM public.trades t
  LEFT JOIN public.trade_reflection tr ON t.id = tr.trade_id
  WHERE t.user_id = p_user_id 
    AND DATE(t.entry_time) = p_reflection_date;

  -- Get top mistakes
  SELECT array_agg(mistake) INTO v_top_mistakes
  FROM (
    SELECT unnest(mistake_tags) as mistake, COUNT(*) as mistake_count
    FROM public.trades 
    WHERE user_id = p_user_id 
      AND DATE(entry_time) = p_reflection_date
      AND mistake_tags IS NOT NULL 
      AND mistake_tags != '{}'
    GROUP BY mistake
    ORDER BY mistake_count DESC
    LIMIT 5
  ) top_mistakes;

  -- Get top positive actions
  SELECT array_agg(good_action) INTO v_positive_actions
  FROM (
    SELECT unnest(good_actions) as good_action, COUNT(*) as good_action_count
    FROM public.trades 
    WHERE user_id = p_user_id 
      AND DATE(entry_time) = p_reflection_date
      AND good_actions IS NOT NULL 
      AND good_actions != '{}'
    GROUP BY good_action
    ORDER BY good_action_count DESC
    LIMIT 5
  ) top_actions;

  -- Insert or update daily reflection
  INSERT INTO public.daily_reflection (
    user_id,
    reflection_date,
    total_trades,
    net_r_multiple,
    net_pnl,
    avg_emotional_score,
    plan_adherence_percentage,
    bias_accuracy_percentage,
    session_discipline_percentage,
    top_mistakes,
    positive_actions
  ) VALUES (
    p_user_id,
    p_reflection_date,
    COALESCE(v_trade_stats.total_trades, 0),
    COALESCE(v_trade_stats.net_r_multiple, 0),
    COALESCE(v_trade_stats.net_pnl, 0),
    COALESCE(v_trade_stats.avg_emotional, 0),
    COALESCE(v_trade_stats.plan_adherence, 0),
    COALESCE(v_trade_stats.bias_accuracy, 0),
    COALESCE(v_trade_stats.session_discipline, 0),
    COALESCE(v_top_mistakes, '{}'),
    COALESCE(v_positive_actions, '{}')
  )
  ON CONFLICT (user_id, reflection_date) 
  DO UPDATE SET
    total_trades = EXCLUDED.total_trades,
    net_r_multiple = EXCLUDED.net_r_multiple,
    net_pnl = EXCLUDED.net_pnl,
    avg_emotional_score = EXCLUDED.avg_emotional_score,
    plan_adherence_percentage = EXCLUDED.plan_adherence_percentage,
    bias_accuracy_percentage = EXCLUDED.bias_accuracy_percentage,
    session_discipline_percentage = EXCLUDED.session_discipline_percentage,
    top_mistakes = EXCLUDED.top_mistakes,
    positive_actions = EXCLUDED.positive_actions,
    updated_at = now()
  RETURNING * INTO v_reflection;

  RETURN v_reflection;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to get reflection analytics (from ALL trades, not just reflections)
CREATE OR REPLACE FUNCTION get_reflection_analytics(
  p_user_id uuid,
  p_days integer DEFAULT 30
) RETURNS TABLE (
  reflection_date date,
  total_trades integer,
  net_r_multiple decimal,
  net_pnl decimal,
  emotional_score decimal,
  plan_adherence decimal,
  bias_accuracy decimal,
  session_discipline decimal,
  top_mistakes text[],
  positive_actions text[]
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_trade_stats AS (
    SELECT 
      DATE(t.entry_time) as trade_date,
      COUNT(*) as total_trades,
      COALESCE(SUM(t.r_multiple), 0) as net_r_multiple,
      COALESCE(SUM(t.pnl), 0) as net_pnl,
      COALESCE(AVG(tr.emotional_rating), 0) as avg_emotional_score,
      COALESCE(
        (COUNT(*) FILTER (WHERE t.mistake_tags = '{}' OR t.mistake_tags IS NULL) * 100.0 / COUNT(*)), 
        0
      ) as plan_adherence,
      COALESCE(
        (COUNT(*) FILTER (WHERE tr.bias_match = true) * 100.0 / COUNT(*)), 
        0
      ) as bias_accuracy,
      COALESCE(
        (COUNT(*) FILTER (WHERE tr.session_appropriate = true) * 100.0 / COUNT(*)), 
        0
      ) as session_discipline
    FROM public.trades t
    LEFT JOIN public.trade_reflection tr ON t.id = tr.trade_id
    WHERE t.user_id = p_user_id 
      AND t.entry_time >= CURRENT_DATE - INTERVAL '1 day' * p_days
    GROUP BY DATE(t.entry_time)
  ),
  daily_mistakes AS (
    SELECT 
      trade_date,
      array_agg(mistake ORDER BY mistake_count DESC) as top_mistakes
    FROM (
      SELECT 
        DATE(t.entry_time) as trade_date,
        unnest(t.mistake_tags) as mistake,
        COUNT(*) as mistake_count
      FROM public.trades t
      WHERE t.user_id = p_user_id 
        AND t.entry_time >= CURRENT_DATE - INTERVAL '1 day' * p_days
        AND t.mistake_tags IS NOT NULL 
        AND t.mistake_tags != '{}'
      GROUP BY DATE(t.entry_time), mistake
      ORDER BY mistake_count DESC
      LIMIT 5
    ) grouped_mistakes
    GROUP BY trade_date
  ),
  daily_actions AS (
    SELECT 
      trade_date,
      array_agg(good_action ORDER BY action_count DESC) as positive_actions
    FROM (
      SELECT 
        DATE(t.entry_time) as trade_date,
        unnest(t.good_actions) as good_action,
        COUNT(*) as action_count
      FROM public.trades t
      WHERE t.user_id = p_user_id 
        AND t.entry_time >= CURRENT_DATE - INTERVAL '1 day' * p_days
        AND t.good_actions IS NOT NULL 
        AND t.good_actions != '{}'
      GROUP BY DATE(t.entry_time), good_action
      ORDER BY action_count DESC
      LIMIT 5
    ) grouped_actions
    GROUP BY trade_date
  )
  SELECT 
    dts.trade_date,
    dts.total_trades::integer,
    dts.net_r_multiple,
    dts.net_pnl,
    dts.avg_emotional_score,
    dts.plan_adherence,
    dts.bias_accuracy,
    dts.session_discipline,
    COALESCE(dm.top_mistakes, ARRAY[]::text[]),
    COALESCE(da.positive_actions, ARRAY[]::text[])
  FROM daily_trade_stats dts
  LEFT JOIN daily_mistakes dm ON dts.trade_date = dm.trade_date
  LEFT JOIN daily_actions da ON dts.trade_date = da.trade_date
  ORDER BY dts.trade_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create trigger to auto-update daily reflection when trades change
CREATE OR REPLACE FUNCTION trigger_update_daily_reflection()
RETURNS TRIGGER AS $$
BEGIN
  -- Update daily reflection for the trade date
  PERFORM generate_daily_reflection(
    COALESCE(NEW.user_id, OLD.user_id),
    DATE(COALESCE(NEW.entry_time, OLD.entry_time))
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_daily_reflection_on_trade_change ON public.trades;

CREATE TRIGGER update_daily_reflection_on_trade_change
  AFTER INSERT OR UPDATE OR DELETE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_reflection();

-- 9. Create trigger to auto-update daily reflection when trade reflection changes
CREATE OR REPLACE FUNCTION trigger_update_daily_reflection_from_reflection()
RETURNS TRIGGER AS $$
DECLARE
  v_trade_date date;
BEGIN
  -- Get the trade date
  SELECT DATE(entry_time) INTO v_trade_date
  FROM public.trades
  WHERE id = COALESCE(NEW.trade_id, OLD.trade_id);
  
  -- Update daily reflection for the trade date
  PERFORM generate_daily_reflection(
    COALESCE(NEW.user_id, OLD.user_id),
    v_trade_date
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_daily_reflection_on_reflection_change ON public.trade_reflection;

CREATE TRIGGER update_daily_reflection_on_reflection_change
  AFTER INSERT OR UPDATE OR DELETE ON public.trade_reflection
  FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_reflection_from_reflection();
