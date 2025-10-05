-- Daily Session Pattern Tracking
-- Adds support for tracking daily session behaviors and scenario inference

-- Create behavior enum
DO $$
BEGIN
  CREATE TYPE public.session_behavior AS ENUM ('continuation', 'reversal', 'consolidation', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create scenario enum
DO $$
BEGIN
  CREATE TYPE public.session_scenario AS ENUM ('S1', 'S2', 'S3', 'none');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create daily session pattern table
CREATE TABLE IF NOT EXISTS public.daily_session_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  asia_behavior public.session_behavior NOT NULL DEFAULT 'unknown',
  london_behavior public.session_behavior NOT NULL DEFAULT 'unknown',
  ny_behavior public.session_behavior NOT NULL DEFAULT 'unknown',
  inferred_scenario public.session_scenario NOT NULL DEFAULT 'none',
  confidence integer CHECK (confidence >= 0 AND confidence <= 100),
  notes text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_session_patterns_date 
  ON public.daily_session_patterns (date);

CREATE INDEX IF NOT EXISTS idx_daily_session_patterns_user_date 
  ON public.daily_session_patterns (user_id, date);

CREATE INDEX IF NOT EXISTS idx_daily_session_patterns_scenario 
  ON public.daily_session_patterns (inferred_scenario);

-- Create function to infer scenario
CREATE OR REPLACE FUNCTION public.infer_session_scenario(
  asia_behavior public.session_behavior,
  london_behavior public.session_behavior,
  ny_behavior public.session_behavior
) RETURNS TABLE(
  scenario public.session_scenario,
  confidence integer,
  expected_asia public.session_behavior,
  expected_london public.session_behavior,
  expected_ny public.session_behavior
) LANGUAGE plpgsql AS $$
DECLARE
  result_scenario public.session_scenario := 'none';
  result_confidence integer := 0;
  asia_expected public.session_behavior := asia_behavior;
  london_expected public.session_behavior := london_behavior;
  ny_expected public.session_behavior := ny_behavior;
  known_count integer := 0;
BEGIN
  -- Count known behaviors (need at least 2)
  known_count := 0;
  IF asia_behavior != 'unknown' THEN known_count := known_count + 1; END IF;
  IF london_behavior != 'unknown' THEN known_count := known_count + 1; END IF;
  IF ny_behavior != 'unknown' THEN known_count := known_count + 1; END IF;
  
  -- Need at least 2 known behaviors to make a prediction
  IF known_count < 2 THEN
    RETURN QUERY SELECT 'none'::public.session_scenario, 0, asia_behavior, london_behavior, ny_behavior;
    RETURN;
  END IF;

  -- S1: Asia=Consolidation, London=Reversal, NY=Continuation
  IF (asia_behavior = 'consolidation' OR asia_behavior = 'unknown') AND
     (london_behavior = 'reversal' OR london_behavior = 'unknown') AND
     (ny_behavior = 'continuation' OR ny_behavior = 'unknown') THEN
    result_scenario := 'S1';
    result_confidence := CASE 
      WHEN known_count = 3 THEN 100
      WHEN known_count = 2 THEN 67
      ELSE 50
    END;
    
    IF asia_behavior = 'unknown' THEN asia_expected := 'consolidation'; END IF;
    IF london_behavior = 'unknown' THEN london_expected := 'reversal'; END IF;
    IF ny_behavior = 'unknown' THEN ny_expected := 'continuation'; END IF;
  END IF;

  -- S2: Asia=Continuation, London=Consolidation, NY=Continuation
  IF (asia_behavior = 'continuation' OR asia_behavior = 'unknown') AND
     (london_behavior = 'consolidation' OR london_behavior = 'unknown') AND
     (ny_behavior = 'continuation' OR ny_behavior = 'unknown') AND
     result_scenario = 'none' THEN
    result_scenario := 'S2';
    result_confidence := CASE 
      WHEN known_count = 3 THEN 100
      WHEN known_count = 2 THEN 67
      ELSE 50
    END;
    
    IF asia_behavior = 'unknown' THEN asia_expected := 'continuation'; END IF;
    IF london_behavior = 'unknown' THEN london_expected := 'consolidation'; END IF;
    IF ny_behavior = 'unknown' THEN ny_expected := 'continuation'; END IF;
  END IF;

  -- S3: Asia=Continuation, London=Continuation, NY=Reversal
  IF (asia_behavior = 'continuation' OR asia_behavior = 'unknown') AND
     (london_behavior = 'continuation' OR london_behavior = 'unknown') AND
     (ny_behavior = 'reversal' OR ny_behavior = 'unknown') AND
     result_scenario = 'none' THEN
    result_scenario := 'S3';
    result_confidence := CASE 
      WHEN known_count = 3 THEN 100
      WHEN known_count = 2 THEN 67
      ELSE 50
    END;
    
    IF asia_behavior = 'unknown' THEN asia_expected := 'continuation'; END IF;
    IF london_behavior = 'unknown' THEN london_expected := 'continuation'; END IF;
    IF ny_behavior = 'unknown' THEN ny_expected := 'reversal'; END IF;
  END IF;

  RETURN QUERY SELECT result_scenario, result_confidence, asia_expected, london_expected, ny_expected;
END;
$$;

-- Create trigger to auto-update scenario when patterns change
CREATE OR REPLACE FUNCTION public.update_session_scenario()
RETURNS TRIGGER AS $$
DECLARE
  scenario_result RECORD;
BEGIN
  SELECT * INTO scenario_result FROM public.infer_session_scenario(
    NEW.asia_behavior,
    NEW.london_behavior,
    NEW.ny_behavior
  );
  
  NEW.inferred_scenario := scenario_result.scenario;
  NEW.confidence := scenario_result.confidence;
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_scenario
  BEFORE INSERT OR UPDATE ON public.daily_session_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_session_scenario();

-- Create view for easy access to current day's pattern
CREATE OR REPLACE VIEW public.v_current_session_pattern AS
SELECT 
  dsp.*,
  CASE 
    WHEN dsp.inferred_scenario = 'S1' THEN 'NY tends to continue after London reverses an Asian range.'
    WHEN dsp.inferred_scenario = 'S2' THEN 'Asia continues, London ranges, NY continues the trend.'
    WHEN dsp.inferred_scenario = 'S3' THEN 'Asia + London continue, watch NY for reversal.'
    ELSE 'No clear scenario pattern detected.'
  END as scenario_hint
FROM public.daily_session_patterns dsp
WHERE dsp.date = CURRENT_DATE;

-- Enable RLS
ALTER TABLE public.daily_session_patterns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own session patterns" ON public.daily_session_patterns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own session patterns" ON public.daily_session_patterns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session patterns" ON public.daily_session_patterns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own session patterns" ON public.daily_session_patterns
  FOR DELETE USING (auth.uid() = user_id);
