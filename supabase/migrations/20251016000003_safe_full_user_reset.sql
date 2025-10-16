-- Safe and complete user data reset RPC
-- Deletes across all related tables using SECURITY DEFINER to bypass RLS
-- Idempotent and resilient to partial schema differences

SET search_path = public, extensions;

CREATE OR REPLACE FUNCTION public.safe_full_user_reset(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted jsonb := '{}'::jsonb;
  v_count int;
BEGIN
  -- Disable user triggers that may block deletes via exceptions (e.g., stats recompute)
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trades') THEN
      EXECUTE 'ALTER TABLE public.trades DISABLE TRIGGER USER';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='daily_stats') THEN
      EXECUTE 'ALTER TABLE public.daily_stats DISABLE TRIGGER USER';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='challenge_phases') THEN
      EXECUTE 'ALTER TABLE public.challenge_phases DISABLE TRIGGER USER';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='challenge_daily_state') THEN
      EXECUTE 'ALTER TABLE public.challenge_daily_state DISABLE TRIGGER USER';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- proceed even if we cannot change triggers
    NULL;
  END;

  -- Delete in safe order: reflections → trades → rest
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trade_reflection') THEN
    DELETE FROM public.trade_reflection WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('trade_reflection', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='daily_reflection') THEN
    DELETE FROM public.daily_reflection WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('daily_reflection', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='daily_session_patterns') THEN
    DELETE FROM public.daily_session_patterns WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('daily_session_patterns', v_count);
  END IF;

  -- Trades next
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trades') THEN
    DELETE FROM public.trades WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('trades', v_count);
  END IF;

  -- Daily stats (after trades)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='daily_stats') THEN
    DELETE FROM public.daily_stats WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('daily_stats', v_count);
  END IF;

  -- Bias state (support both schemas: selected_by or user_id)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bias_state') THEN
    BEGIN
      DELETE FROM public.bias_state WHERE selected_by = p_user_id;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      v_deleted := v_deleted || jsonb_build_object('bias_state', COALESCE((v_deleted->>'bias_state')::int,0) + v_count);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema='public' AND table_name='bias_state' AND column_name='user_id'
    ) THEN
      BEGIN
        DELETE FROM public.bias_state WHERE user_id = p_user_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        v_deleted := v_deleted || jsonb_build_object('bias_state', COALESCE((v_deleted->>'bias_state')::int,0) + v_count);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  -- Challenge state
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='challenge_daily_state') THEN
    DELETE FROM public.challenge_daily_state WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('challenge_daily_state', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='challenge_phases') THEN
    DELETE FROM public.challenge_phases WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('challenge_phases', v_count);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='discipline_challenges') THEN
    DELETE FROM public.discipline_challenges WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('discipline_challenges', v_count);
  END IF;

  -- User settings last
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_settings') THEN
    DELETE FROM public.user_settings WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_count = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('user_settings', v_count);
  END IF;

  -- Re-enable triggers (best-effort)
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trades') THEN
      EXECUTE 'ALTER TABLE public.trades ENABLE TRIGGER USER';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='daily_stats') THEN
      EXECUTE 'ALTER TABLE public.daily_stats ENABLE TRIGGER USER';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='challenge_phases') THEN
      EXECUTE 'ALTER TABLE public.challenge_phases ENABLE TRIGGER USER';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='challenge_daily_state') THEN
      EXECUTE 'ALTER TABLE public.challenge_daily_state ENABLE TRIGGER USER';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object('success', true, 'deleted', v_deleted);
EXCEPTION WHEN OTHERS THEN
  -- Attempt to re-enable triggers even if something failed
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='trades') THEN
      EXECUTE 'ALTER TABLE public.trades ENABLE TRIGGER USER';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='daily_stats') THEN
      EXECUTE 'ALTER TABLE public.daily_stats ENABLE TRIGGER USER';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='challenge_phases') THEN
      EXECUTE 'ALTER TABLE public.challenge_phases ENABLE TRIGGER USER';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='challenge_daily_state') THEN
      EXECUTE 'ALTER TABLE public.challenge_daily_state ENABLE TRIGGER USER';
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'deleted', COALESCE(v_deleted,'{}'::jsonb));
END;
$$;

-- Allow authenticated users to call the function
GRANT EXECUTE ON FUNCTION public.safe_full_user_reset(uuid) TO authenticated;

-- Optional: nudge PostgREST to reload
NOTIFY pgrst, 'reload schema';


