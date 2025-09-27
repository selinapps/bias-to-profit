DO $$
BEGIN
  CREATE TYPE public.bias_enum AS ENUM ('OOB_LONG', 'OOB_SHORT', 'MR_LONG', 'MR_SHORT', 'NONE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.market_state_enum AS ENUM ('OUT_OF_BALANCE', 'IN_BALANCE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

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

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS checklist jsonb;

UPDATE public.trades
SET checklist = '[]'::jsonb
WHERE checklist IS NULL;

ALTER TABLE public.trades
  ALTER COLUMN checklist SET DEFAULT '[]'::jsonb,
  ALTER COLUMN checklist SET NOT NULL;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS checklist_complete boolean;

UPDATE public.trades
SET checklist_complete = COALESCE(checklist_complete, false);

ALTER TABLE public.trades
  ALTER COLUMN checklist_complete SET DEFAULT false,
  ALTER COLUMN checklist_complete SET NOT NULL;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS bias_snapshot jsonb;

UPDATE public.trades
SET bias_snapshot = '{}'::jsonb
WHERE bias_snapshot IS NULL;

ALTER TABLE public.trades
  ALTER COLUMN bias_snapshot SET DEFAULT '{}'::jsonb,
  ALTER COLUMN bias_snapshot SET NOT NULL;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS session text;
