-- Ensures the bias state storage, helper view, and RPC functions exist even
-- if earlier migrations failed because the table type was missing at compile
-- time.

DO $$
BEGIN
  CREATE TYPE public.bias_enum AS ENUM ('OOB_LONG', 'OOB_SHORT', 'MR_LONG', 'MR_SHORT', 'NONE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  CREATE TYPE public.market_state_enum AS ENUM ('OUT_OF_BALANCE', 'IN_BALANCE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

CREATE TABLE IF NOT EXISTS public.bias_state (
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

ALTER TABLE public.bias_state
  ALTER COLUMN day_key SET NOT NULL,
  ALTER COLUMN bias SET NOT NULL,
  ALTER COLUMN selected_at SET NOT NULL,
  ALTER COLUMN active SET NOT NULL,
  ALTER COLUMN selected_at SET DEFAULT now(),
  ALTER COLUMN active SET DEFAULT true;

ALTER TABLE public.bias_state
  ALTER COLUMN tags SET DATA TYPE jsonb USING COALESCE(tags, '{}'::jsonb);

CREATE UNIQUE INDEX IF NOT EXISTS bias_state_active_day_key
  ON public.bias_state (day_key, active)
  WHERE active;

DROP VIEW IF EXISTS public.v_current_bias;
CREATE VIEW public.v_current_bias AS
SELECT DISTINCT ON (day_key)
  day_key,
  id,
  bias,
  market_state,
  confidence,
  tags,
  selected_at
FROM public.bias_state
WHERE active
ORDER BY day_key, selected_at DESC;

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

GRANT EXECUTE ON FUNCTION public.get_current_bias(date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_current_bias(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_bias_state(date, public.bias_enum, public.market_state_enum, text, text[]) TO authenticated;
