-- Fix 406 error for bias_state table
-- This ensures proper RLS policies and correct table structure

-- First, ensure we have the correct bias_state table structure with ENUM types
DO $$
BEGIN
  -- Drop and recreate the table to ensure correct structure
  DROP TABLE IF EXISTS public.bias_state CASCADE;
  
  CREATE TABLE public.bias_state (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    day_key date NOT NULL,
    bias public.bias_enum NOT NULL,
    market_state public.market_state_enum,
    confidence text,
    tags jsonb,
    selected_at timestamptz NOT NULL DEFAULT now(),
    selected_by uuid REFERENCES auth.users (id),
    active boolean NOT NULL DEFAULT true
  );

  -- Create indexes
  CREATE UNIQUE INDEX bias_state_active_day_key
    ON public.bias_state (day_key, active)
    WHERE active;

  CREATE INDEX idx_bias_state_day_key ON public.bias_state(day_key);
  CREATE INDEX idx_bias_state_active ON public.bias_state(active);
  CREATE INDEX idx_bias_state_selected_by ON public.bias_state(selected_by);

  -- Enable RLS
  ALTER TABLE public.bias_state ENABLE ROW LEVEL SECURITY;

  -- Create RLS policies
  CREATE POLICY "Users can view bias state" ON public.bias_state FOR SELECT TO authenticated USING (true);
  CREATE POLICY "Users can insert bias state" ON public.bias_state FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Users can update bias state" ON public.bias_state FOR UPDATE TO authenticated USING (true);
  CREATE POLICY "Users can delete bias state" ON public.bias_state FOR DELETE TO authenticated USING (true);

  -- Grant table permissions
  GRANT ALL ON public.bias_state TO authenticated;
  GRANT ALL ON public.bias_state TO anon;

EXCEPTION
  WHEN OTHERS THEN
    -- If there are any errors, just ensure RLS policies exist
    ALTER TABLE public.bias_state ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view bias state" ON public.bias_state;
    DROP POLICY IF EXISTS "Users can insert bias state" ON public.bias_state;
    DROP POLICY IF EXISTS "Users can update bias state" ON public.bias_state;
    DROP POLICY IF EXISTS "Users can delete bias state" ON public.bias_state;
    
    -- Create RLS policies
    CREATE POLICY "Users can view bias state" ON public.bias_state FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Users can insert bias state" ON public.bias_state FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "Users can update bias state" ON public.bias_state FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "Users can delete bias state" ON public.bias_state FOR DELETE TO authenticated USING (true);
    
    -- Grant table permissions
    GRANT ALL ON public.bias_state TO authenticated;
    GRANT ALL ON public.bias_state TO anon;
END $$;

-- Recreate the v_current_bias view
DROP VIEW IF EXISTS public.v_current_bias;
CREATE VIEW public.v_current_bias AS
SELECT DISTINCT ON (day_key)
  day_key,
  id,
  bias,
  market_state,
  confidence,
  tags,
  selected_at,
  selected_by,
  active
FROM public.bias_state
WHERE active
ORDER BY day_key, selected_at DESC;

-- Grant permissions on the view
GRANT SELECT ON public.v_current_bias TO authenticated;
GRANT SELECT ON public.v_current_bias TO anon;

-- Ensure the functions exist and have correct permissions
CREATE OR REPLACE FUNCTION public.get_current_bias(target_day date)
RETURNS public.bias_state
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT bs
  FROM public.bias_state AS bs
  WHERE bs.day_key = target_day
    AND bs.active
  ORDER BY bs.selected_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.set_bias_state(
  target_day date,
  target_bias public.bias_enum,
  target_market_state public.market_state_enum DEFAULT NULL,
  target_confidence text DEFAULT NULL,
  target_tags text[] DEFAULT NULL
)
RETURNS public.bias_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_selected_by uuid := auth.uid();
  v_inserted public.bias_state;
BEGIN
  IF v_selected_by IS NULL THEN
    RAISE EXCEPTION 'Missing authenticated user for bias selection';
  END IF;

  UPDATE public.bias_state
     SET active = FALSE
   WHERE day_key = target_day
     AND active;

  INSERT INTO public.bias_state (
    day_key,
    bias,
    market_state,
    confidence,
    tags,
    selected_by,
    active
  )
  VALUES (
    target_day,
    target_bias,
    target_market_state,
    target_confidence,
    CASE WHEN target_tags IS NULL THEN NULL ELSE to_jsonb(target_tags) END,
    v_selected_by,
    TRUE
  )
  RETURNING * INTO v_inserted;

  RETURN v_inserted;
END;
$$;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.get_current_bias(date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_current_bias(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_bias_state(date, public.bias_enum, public.market_state_enum, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_bias_state(date, public.bias_enum, public.market_state_enum, text, text[]) TO anon;
