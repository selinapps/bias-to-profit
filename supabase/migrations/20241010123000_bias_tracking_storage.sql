-- Bias tracking schema hardening
-- Ensures the bias_state table, supporting enums, and RLS policies exist so the app can persist selections.

-- Create enum types if they are missing (idempotent)
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

-- Create the bias_state table if it does not already exist
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

-- Preserve non-null constraints and defaults even if the table existed before
ALTER TABLE public.bias_state
  ALTER COLUMN day_key SET NOT NULL,
  ALTER COLUMN bias SET NOT NULL,
  ALTER COLUMN selected_at SET NOT NULL,
  ALTER COLUMN active SET NOT NULL,
  ALTER COLUMN selected_at SET DEFAULT now(),
  ALTER COLUMN active SET DEFAULT true;

-- Ensure the selected_by column references auth.users (if it already does, the exception is ignored)
DO $$
BEGIN
  ALTER TABLE public.bias_state
    ADD CONSTRAINT bias_state_selected_by_fkey
    FOREIGN KEY (selected_by) REFERENCES auth.users(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- Helpful index so only one active entry exists per day
CREATE UNIQUE INDEX IF NOT EXISTS bias_state_active_day_key
  ON public.bias_state (day_key, active)
  WHERE active;

-- Enable row level security and allow authenticated users to work with the bias state
ALTER TABLE public.bias_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Bias state select"
  ON public.bias_state
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Bias state insert"
  ON public.bias_state
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Bias state update"
  ON public.bias_state
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Bias state delete"
  ON public.bias_state
  FOR DELETE
  TO authenticated
  USING (true);
