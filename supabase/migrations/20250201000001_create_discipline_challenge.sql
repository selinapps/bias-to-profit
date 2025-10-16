-- 30-Day Discipline Challenge System
-- Creates comprehensive tracking for trading discipline rules

-- ============================================================================
-- 1. CREATE DISCIPLINE CHALLENGE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.discipline_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_name text NOT NULL DEFAULT '30-Day Discipline Challenge',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status text NOT NULL CHECK (status IN ('active', 'completed', 'failed', 'paused')) DEFAULT 'active',
  
  -- Challenge rules and settings
  max_daily_losses integer NOT NULL DEFAULT 3,
  max_risk_per_trade numeric(5,2) NOT NULL DEFAULT 2.00, -- 2% max risk
  house_money_threshold numeric(5,2) NOT NULL DEFAULT 3.00, -- 3% profit threshold
  must_follow_setup boolean NOT NULL DEFAULT true,
  no_sl_movement boolean NOT NULL DEFAULT true,
  
  -- Progress tracking
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  total_days_completed integer NOT NULL DEFAULT 0,
  total_rule_violations integer NOT NULL DEFAULT 0,
  
  -- Daily state tracking
  current_day integer NOT NULL DEFAULT 1,
  daily_violations integer NOT NULL DEFAULT 0,
  daily_score numeric(5,2) NOT NULL DEFAULT 0.00, -- 0-100 score
  is_day_completed boolean NOT NULL DEFAULT false,
  
  -- Challenge completion
  completion_percentage numeric(5,2) NOT NULL DEFAULT 0.00,
  final_score numeric(5,2),
  completed_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. CREATE DAILY DISCIPLINE TRACKING TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_discipline_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.discipline_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracking_date date NOT NULL,
  day_number integer NOT NULL,
  
  -- Rule adherence tracking
  followed_setup boolean NOT NULL DEFAULT true,
  respected_sl boolean NOT NULL DEFAULT true,
  respected_risk boolean NOT NULL DEFAULT true,
  respected_house_money boolean NOT NULL DEFAULT true,
  respected_3_losses boolean NOT NULL DEFAULT true,
  
  -- Violation details
  violations jsonb DEFAULT '[]'::jsonb, -- Array of violation objects
  violation_count integer NOT NULL DEFAULT 0,
  
  -- Daily metrics
  trades_taken integer NOT NULL DEFAULT 0,
  profitable_trades integer NOT NULL DEFAULT 0,
  losing_trades integer NOT NULL DEFAULT 0,
  total_pnl numeric(10,2) NOT NULL DEFAULT 0.00,
  max_risk_used numeric(5,2) NOT NULL DEFAULT 0.00,
  
  -- Scoring
  daily_score numeric(5,2) NOT NULL DEFAULT 100.00, -- Start with perfect score
  discipline_notes text,
  
  -- Completion status
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(challenge_id, tracking_date)
);

-- ============================================================================
-- 3. CREATE RULE VIOLATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rule_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.discipline_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id uuid REFERENCES public.trades(id) ON DELETE SET NULL,
  violation_date date NOT NULL,
  day_number integer NOT NULL,
  
  -- Violation details
  violation_type text NOT NULL CHECK (violation_type IN (
    'setup_violation', 'sl_movement', 'risk_exceeded', 
    'house_money_violation', 'three_losses_violation'
  )),
  violation_description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('minor', 'major', 'critical')) DEFAULT 'minor',
  
  -- Context
  trade_context jsonb DEFAULT '{}',
  violation_context jsonb DEFAULT '{}',
  
  -- Resolution
  is_acknowledged boolean NOT NULL DEFAULT false,
  acknowledgment_notes text,
  resolved_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Discipline challenges indexes
CREATE INDEX IF NOT EXISTS idx_discipline_challenges_user_id ON public.discipline_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_discipline_challenges_status ON public.discipline_challenges(status);
CREATE INDEX IF NOT EXISTS idx_discipline_challenges_active ON public.discipline_challenges(user_id, status) WHERE status = 'active';

-- Daily tracking indexes
CREATE INDEX IF NOT EXISTS idx_daily_tracking_challenge_id ON public.daily_discipline_tracking(challenge_id);
CREATE INDEX IF NOT EXISTS idx_daily_tracking_date ON public.daily_discipline_tracking(tracking_date);
CREATE INDEX IF NOT EXISTS idx_daily_tracking_user_date ON public.daily_discipline_tracking(user_id, tracking_date);

-- Rule violations indexes
CREATE INDEX IF NOT EXISTS idx_rule_violations_challenge_id ON public.rule_violations(challenge_id);
CREATE INDEX IF NOT EXISTS idx_rule_violations_date ON public.rule_violations(violation_date);
CREATE INDEX IF NOT EXISTS idx_rule_violations_type ON public.rule_violations(violation_type);

-- ============================================================================
-- 5. CREATE FUNCTIONS FOR CHALLENGE MANAGEMENT
-- ============================================================================

-- Function to create a new discipline challenge
CREATE OR REPLACE FUNCTION create_discipline_challenge(
  p_user_id uuid,
  p_challenge_name text DEFAULT '30-Day Discipline Challenge',
  p_max_daily_losses integer DEFAULT 3,
  p_max_risk_per_trade numeric DEFAULT 2.00,
  p_house_money_threshold numeric DEFAULT 3.00
)
RETURNS uuid AS $$
DECLARE
  challenge_id uuid;
BEGIN
  -- Check if user already has an active challenge
  IF EXISTS (
    SELECT 1 FROM public.discipline_challenges 
    WHERE user_id = p_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'User already has an active discipline challenge';
  END IF;
  
  -- Create new challenge
  INSERT INTO public.discipline_challenges (
    user_id, challenge_name, max_daily_losses, 
    max_risk_per_trade, house_money_threshold
  ) VALUES (
    p_user_id, p_challenge_name, p_max_daily_losses,
    p_max_risk_per_trade, p_house_money_threshold
  ) RETURNING id INTO challenge_id;
  
  RETURN challenge_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get challenge progress
CREATE OR REPLACE FUNCTION get_challenge_progress(p_challenge_id uuid)
RETURNS TABLE (
  challenge_id uuid,
  challenge_name text,
  start_date date,
  end_date date,
  current_day integer,
  total_days integer,
  current_streak integer,
  longest_streak integer,
  completion_percentage numeric,
  daily_score numeric,
  total_violations integer,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.challenge_name,
    dc.start_date,
    dc.end_date,
    dc.current_day,
    30 as total_days,
    dc.current_streak,
    dc.longest_streak,
    dc.completion_percentage,
    COALESCE(ddt.daily_score, 0) as daily_score,
    dc.total_rule_violations as total_violations,
    dc.status
  FROM public.discipline_challenges dc
  LEFT JOIN public.daily_discipline_tracking ddt 
    ON dc.id = ddt.challenge_id 
    AND ddt.tracking_date = CURRENT_DATE
  WHERE dc.id = p_challenge_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record daily discipline tracking
CREATE OR REPLACE FUNCTION record_daily_discipline(
  p_challenge_id uuid,
  p_tracking_date date DEFAULT CURRENT_DATE,
  p_followed_setup boolean DEFAULT true,
  p_respected_sl boolean DEFAULT true,
  p_respected_risk boolean DEFAULT true,
  p_respected_house_money boolean DEFAULT true,
  p_respected_3_losses boolean DEFAULT true,
  p_trades_taken integer DEFAULT 0,
  p_profitable_trades integer DEFAULT 0,
  p_losing_trades integer DEFAULT 0,
  p_total_pnl numeric DEFAULT 0.00,
  p_max_risk_used numeric DEFAULT 0.00,
  p_discipline_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  tracking_id uuid;
  violation_count integer := 0;
  daily_score numeric := 100.00;
  day_number integer;
BEGIN
  -- Get current day number
  SELECT dc.current_day INTO day_number
  FROM public.discipline_challenges dc
  WHERE dc.id = p_challenge_id;
  
  -- Count violations
  IF NOT p_followed_setup THEN violation_count := violation_count + 1; END IF;
  IF NOT p_respected_sl THEN violation_count := violation_count + 1; END IF;
  IF NOT p_respected_risk THEN violation_count := violation_count + 1; END IF;
  IF NOT p_respected_house_money THEN violation_count := violation_count + 1; END IF;
  IF NOT p_respected_3_losses THEN violation_count := violation_count + 1; END IF;
  
  -- Calculate daily score (20 points per rule)
  daily_score := 100.00 - (violation_count * 20.00);
  
  -- Insert or update daily tracking
  INSERT INTO public.daily_discipline_tracking (
    challenge_id, user_id, tracking_date, day_number,
    followed_setup, respected_sl, respected_risk, 
    respected_house_money, respected_3_losses,
    violation_count, trades_taken, profitable_trades, 
    losing_trades, total_pnl, max_risk_used, daily_score,
    discipline_notes, is_completed
  ) VALUES (
    p_challenge_id, (SELECT user_id FROM public.discipline_challenges WHERE id = p_challenge_id),
    p_tracking_date, day_number, p_followed_setup, p_respected_sl, 
    p_respected_risk, p_respected_house_money, p_respected_3_losses,
    violation_count, p_trades_taken, p_profitable_trades,
    p_losing_trades, p_total_pnl, p_max_risk_used, daily_score,
    p_discipline_notes, true
  )
  ON CONFLICT (challenge_id, tracking_date)
  DO UPDATE SET
    followed_setup = p_followed_setup,
    respected_sl = p_respected_sl,
    respected_risk = p_respected_risk,
    respected_house_money = p_respected_house_money,
    respected_3_losses = p_respected_3_losses,
    violation_count = violation_count,
    trades_taken = p_trades_taken,
    profitable_trades = p_profitable_trades,
    losing_trades = p_losing_trades,
    total_pnl = p_total_pnl,
    max_risk_used = p_max_risk_used,
    daily_score = daily_score,
    discipline_notes = p_discipline_notes,
    is_completed = true,
    completed_at = now(),
    updated_at = now()
  RETURNING id INTO tracking_id;
  
  -- Update challenge progress
  UPDATE public.discipline_challenges SET
    total_rule_violations = total_rule_violations + violation_count,
    current_streak = CASE 
      WHEN violation_count = 0 THEN current_streak + 1 
      ELSE 0 
    END,
    longest_streak = GREATEST(longest_streak, 
      CASE WHEN violation_count = 0 THEN current_streak + 1 ELSE 0 END),
    total_days_completed = total_days_completed + 1,
    current_day = current_day + 1,
    completion_percentage = LEAST(100.00, (total_days_completed + 1) * 100.00 / 30.00),
    updated_at = now()
  WHERE id = p_challenge_id;
  
  RETURN tracking_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.discipline_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_discipline_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_violations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own discipline challenges" 
ON public.discipline_challenges FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own daily tracking" 
ON public.daily_discipline_tracking FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own rule violations" 
ON public.rule_violations FOR ALL 
USING (auth.uid() = user_id);

-- ============================================================================
-- 7. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_discipline_challenges_updated_at
  BEFORE UPDATE ON public.discipline_challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_tracking_updated_at
  BEFORE UPDATE ON public.daily_discipline_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
