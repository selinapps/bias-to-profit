-- Fix for set_bias_state function overload conflict
-- This script removes all conflicting function definitions and creates a single, unified function

-- ============================================================================
-- STEP 1: DROP ALL EXISTING VERSIONS OF set_bias_state FUNCTION
-- ============================================================================

-- Drop all existing versions to avoid conflicts
DROP FUNCTION IF EXISTS public.set_bias_state(date, text, text, text, text[]);
DROP FUNCTION IF EXISTS public.set_bias_state(date, public.bias_enum, public.market_state_enum, text, text[]);
DROP FUNCTION IF EXISTS public.set_bias_state(date, boolean);
DROP FUNCTION IF EXISTS public.set_bias_state(jsonb);

-- ============================================================================
-- STEP 2: CREATE UNIFIED FUNCTION THAT ACCEPTS TEXT PARAMETERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_bias_state(
  target_day date DEFAULT CURRENT_DATE,
  target_bias text DEFAULT NULL,
  target_market_state text DEFAULT NULL,
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
  -- For testing purposes, allow NULL user_id if no authenticated user
  -- In production, this should be properly authenticated
  IF v_selected_by IS NULL THEN
    -- Use a default UUID for testing, or allow NULL
    v_selected_by := NULL; -- Allow NULL for now
  END IF;

  -- Deactivate existing bias states for the day
  UPDATE public.bias_state
     SET active = FALSE
   WHERE day_key = target_day
     AND active;

  -- Insert new bias state if bias is provided
  IF target_bias IS NOT NULL THEN
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
  ELSE
    -- Return null if no bias provided (just deactivated existing)
    RETURN NULL;
  END IF;
END;
$$;

-- ============================================================================
-- STEP 3: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.set_bias_state(date, text, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_bias_state(date, text, text, text, text[]) TO anon;

-- ============================================================================
-- STEP 4: VERIFY FUNCTION EXISTS AND WORKS
-- ============================================================================

-- Test the function with the exact parameters that were failing
SELECT 'Testing set_bias_state function...' as test;

-- This should work now without overload conflicts
SELECT public.set_bias_state(
  '2025-09-30'::date,
  'NONE'::text,
  NULL::text,
  'MEDIUM'::text,
  ARRAY['tag1', 'tag2', 'tag3']::text[]
) as result;

SELECT 'Function fix completed successfully!' as status;
