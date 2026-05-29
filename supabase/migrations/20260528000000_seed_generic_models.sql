-- Coach onboarding fix batch #1 support migration.
-- - Seeds the generic model catalog used by fresh/non-Fabio onboarding.
-- - Adds defensive coach/cohort primitives so coach promotion can create cohort
--   rows before profile updates reference those cohort codes.

CREATE TABLE IF NOT EXISTS public.cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coach_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coach_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fabio_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  educator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  scope text NOT NULL DEFAULT 'base',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS educator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.coach_audit_log ADD COLUMN IF NOT EXISTS educator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.coach_audit_log ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.coach_audit_log ADD COLUMN IF NOT EXISTS action text;
ALTER TABLE public.coach_audit_log ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.coach_presets ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.coach_presets ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.coach_presets ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;
ALTER TABLE public.fabio_models ADD COLUMN IF NOT EXISTS educator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.fabio_models ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.fabio_models ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.fabio_models ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'base';
ALTER TABLE public.fabio_models ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS cohorts_code_unique_idx ON public.cohorts (code);
CREATE UNIQUE INDEX IF NOT EXISTS coach_presets_key_unique_idx ON public.coach_presets (key);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_coach boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS managed_cohorts text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coach_preset_key text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cohort_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ibuild_completed boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS fabio_models_unique_base_name_idx
  ON public.fabio_models (COALESCE(educator_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

INSERT INTO public.fabio_models (educator_id, name, description, scope, is_active)
VALUES
  (NULL, 'Breakout', 'A generic model for momentum through a defined range or level.', 'base', true),
  (NULL, 'Reversal', 'A generic model for failed continuation and rotation back through a key area.', 'base', true),
  (NULL, 'Trend Follow', 'A generic model for joining continuation after structure and bias align.', 'base', true),
  (NULL, 'Custom', 'A flexible model placeholder for trader-defined setups and playbooks.', 'base', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.coach_presets (key, name, is_published)
VALUES ('generic', 'Generic', true)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name,
    is_published = true,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.promote_coach_with_cohorts(
  p_user_id uuid,
  p_cohort_codes text[],
  p_preset_key text DEFAULT 'generic',
  p_actor_id uuid DEFAULT auth.uid()
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_existing public.cohorts%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'Coach user id is required';
  END IF;

  FOREACH v_code IN ARRAY COALESCE(p_cohort_codes, ARRAY[]::text[]) LOOP
    v_code := btrim(v_code);
    CONTINUE WHEN v_code IS NULL OR v_code = '';

    SELECT * INTO v_existing
    FROM public.cohorts
    WHERE code = v_code;

    IF FOUND THEN
      IF v_existing.educator_id <> p_user_id THEN
        RAISE EXCEPTION 'Cohort ''%'' is owned by another coach', v_code
          USING ERRCODE = '23505';
      END IF;

      UPDATE public.cohorts
      SET status = 'active', updated_at = now()
      WHERE id = v_existing.id;
    ELSE
      INSERT INTO public.cohorts (educator_id, code, name, status)
      VALUES (p_user_id, v_code, v_code, 'active');

      INSERT INTO public.coach_audit_log (educator_id, actor_id, action, payload)
      VALUES (p_user_id, p_actor_id, 'cohort.created', jsonb_build_object('code', v_code));
    END IF;
  END LOOP;

  UPDATE public.profiles
  SET is_coach = true,
      managed_cohorts = COALESCE(p_cohort_codes, ARRAY[]::text[]),
      coach_preset_key = COALESCE(NULLIF(btrim(p_preset_key), ''), 'generic'),
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, display_name, timezone, risk_settings, is_coach, managed_cohorts, coach_preset_key)
    VALUES (p_user_id, 'Coach', 'UTC', '{}'::jsonb, true, COALESCE(p_cohort_codes, ARRAY[]::text[]), COALESCE(NULLIF(btrim(p_preset_key), ''), 'generic'))
    RETURNING * INTO v_profile;
  END IF;

  INSERT INTO public.coach_audit_log (educator_id, actor_id, action, payload)
  VALUES (p_user_id, p_actor_id, 'coach.promoted', jsonb_build_object('cohorts', COALESCE(p_cohort_codes, ARRAY[]::text[]), 'preset', COALESCE(NULLIF(btrim(p_preset_key), ''), 'generic')));

  RETURN v_profile;
END;
$$;
