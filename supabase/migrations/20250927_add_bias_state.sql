-- Up
BEGIN;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

CREATE TABLE public.bias_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model_id text NOT NULL,
  bias jsonb NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bias_state_user_id ON public.bias_state(user_id);
CREATE INDEX IF NOT EXISTS idx_bias_state_model_id ON public.bias_state(model_id);

ALTER TABLE public.bias_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bias read" ON public.bias_state FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Bias insert" ON public.bias_state FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Bias update" ON public.bias_state FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Bias delete" ON public.bias_state FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
COMMIT;

-- Down
BEGIN;
DROP POLICY IF EXISTS "Bias read" ON public.bias_state;
DROP POLICY IF EXISTS "Bias insert" ON public.bias_state;
DROP POLICY IF EXISTS "Bias update" ON public.bias_state;
DROP POLICY IF EXISTS "Bias delete" ON public.bias_state;
ALTER TABLE IF EXISTS public.bias_state DISABLE ROW LEVEL SECURITY;
DROP INDEX IF EXISTS idx_bias_state_user_id;
DROP INDEX IF EXISTS idx_bias_state_model_id;
DROP TABLE IF EXISTS public.bias_state;
-- keep extension present (do not drop)
COMMIT;
