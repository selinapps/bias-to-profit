-- Update bias types to support Fabio-style bias selection
-- This migration updates the bias values to match the new deterministic system

-- First, let's check what bias values currently exist
-- and update any old values to the new format

-- Update any existing bias values to the new format
UPDATE public.bias_state 
SET bias = CASE 
  WHEN bias = 'NONE' THEN 'FLAT'
  WHEN bias = 'OOB_LONG' THEN 'OOB_LONG'
  WHEN bias = 'OOB_SHORT' THEN 'OOB_SHORT' 
  WHEN bias = 'MR_LONG' THEN 'MR_LONG'
  WHEN bias = 'MR_SHORT' THEN 'MR_SHORT'
  ELSE bias
END
WHERE bias IN ('NONE', 'OOB_LONG', 'OOB_SHORT', 'MR_LONG', 'MR_SHORT');

-- Update market_state values to support UNCLEAR
UPDATE public.bias_state 
SET market_state = CASE 
  WHEN market_state = 'OUT_OF_BALANCE' THEN 'OUT_OF_BALANCE'
  WHEN market_state = 'IN_BALANCE' THEN 'IN_BALANCE'
  WHEN market_state IS NULL OR market_state = '' THEN 'UNCLEAR'
  ELSE market_state
END;

-- Add a comment to document the new bias types
COMMENT ON COLUMN public.bias_state.bias IS 'Bias type: OOB_LONG, OOB_SHORT, MR_LONG, MR_SHORT, or FLAT';
COMMENT ON COLUMN public.bias_state.market_state IS 'Market state: OUT_OF_BALANCE, IN_BALANCE, or UNCLEAR';

-- Create a function to validate bias values
CREATE OR REPLACE FUNCTION public.validate_bias_value(bias_value text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN bias_value IN ('OOB_LONG', 'OOB_SHORT', 'MR_LONG', 'MR_SHORT', 'FLAT');
END;
$$;

-- Create a function to validate market state values  
CREATE OR REPLACE FUNCTION public.validate_market_state_value(market_state_value text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN market_state_value IS NULL OR market_state_value IN ('OUT_OF_BALANCE', 'IN_BALANCE', 'UNCLEAR');
END;
$$;

-- Add check constraints to ensure valid bias values
ALTER TABLE public.bias_state 
ADD CONSTRAINT check_valid_bias 
CHECK (public.validate_bias_value(bias));

ALTER TABLE public.bias_state 
ADD CONSTRAINT check_valid_market_state 
CHECK (public.validate_market_state_value(market_state));

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.set_bias_state(date, text, text, text, text[]);

-- Create the updated set_bias_state function to validate inputs
CREATE OR REPLACE FUNCTION public.set_bias_state(
  target_day date,
  target_bias text,
  target_market_state text DEFAULT NULL,
  target_confidence text DEFAULT NULL,
  target_tags text[] DEFAULT NULL
)
RETURNS public.bias_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_selected_by uuid := auth.uid();
  v_inserted public.bias_state;
BEGIN
  IF v_selected_by IS NULL THEN
    RAISE EXCEPTION 'Missing authenticated user for bias selection';
  END IF;

  -- Validate bias value
  IF NOT public.validate_bias_value(target_bias) THEN
    RAISE EXCEPTION 'Invalid bias value: %', target_bias;
  END IF;

  -- Validate market state if provided
  IF target_market_state IS NOT NULL AND NOT public.validate_market_state_value(target_market_state) THEN
    RAISE EXCEPTION 'Invalid market state value: %', target_market_state;
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

-- Grant permissions for the new validation functions
GRANT EXECUTE ON FUNCTION public.validate_bias_value(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_market_state_value(text) TO authenticated;
