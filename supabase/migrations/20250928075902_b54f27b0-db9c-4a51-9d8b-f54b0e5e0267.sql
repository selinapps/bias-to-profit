-- Fix the set_bias_state function overloading issue
-- Drop existing functions that might conflict
DROP FUNCTION IF EXISTS public.set_bias_state(date, boolean);
DROP FUNCTION IF EXISTS public.set_bias_state(jsonb);

-- Create the unified function that handles bias state updates
CREATE OR REPLACE FUNCTION public.set_bias_state(
  target_day date DEFAULT CURRENT_DATE,
  target_bias text DEFAULT NULL,
  target_market_state text DEFAULT NULL,
  target_confidence integer DEFAULT NULL,
  target_tags text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deactivate existing bias states for the day
  UPDATE public.bias_state 
  SET active = false, updated_at = NOW() 
  WHERE day_key = target_day AND active = true;
  
  -- Insert new bias state if bias is provided
  IF target_bias IS NOT NULL THEN
    INSERT INTO public.bias_state (
      day_key, 
      bias, 
      market_state, 
      confidence, 
      tags, 
      active, 
      selected_at,
      updated_at
    ) 
    VALUES (
      target_day, 
      target_bias, 
      target_market_state, 
      target_confidence, 
      target_tags, 
      true, 
      NOW(),
      NOW()
    );
  END IF;
END;
$$;