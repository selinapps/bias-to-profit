-- Migration: add get_current_bias RPC and v_current_bias view with day_key
BEGIN;

-- Ensure extensions schema exists and pgcrypto present in extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1) PostgREST-friendly RPC: stable strict function returning jsonb
CREATE OR REPLACE FUNCTION public.get_current_bias(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
STRICT
AS $$
  SELECT to_jsonb(b)
  FROM public.bias b
  JOIN (
    SELECT user_id, max(created_at) AS max_created
    FROM public.bias
    GROUP BY user_id
  ) latest ON b.user_id = latest.user_id AND b.created_at = latest.max_created
  WHERE b.user_id = p_user_id
  LIMIT 1;
$$;

-- 2) Recreate view including day_key (ensure explicit columns)
DROP VIEW IF EXISTS public.v_current_bias;
CREATE VIEW public.v_current_bias WITH (security_invoker=on) AS
SELECT
  b.id,
  b.user_id,
  b.level,
  b.source,
  b.created_at,
  b.updated_at,
  (b.created_at::date) AS day_key
FROM public.bias b
JOIN (
  SELECT user_id, max(created_at) AS max_created
  FROM public.bias
  GROUP BY user_id
) latest ON b.user_id = latest.user_id AND b.created_at = latest.max_created;

-- 3) Grants for REST access
GRANT SELECT ON public.v_current_bias TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_bias(uuid) TO anon, authenticated;

COMMIT;
