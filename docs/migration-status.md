# Migration Execution Status

The Supabase CLI is not available in this environment, so the project's migrations could not be executed automatically. The error logs from the running application show that three database objects are missing:

- `public.bias_state` table
- `public.v_current_bias` view
- `public.get_current_bias` RPC function

Until those objects exist, any feature that reads or writes the shared bias state will fail. Follow the steps below to bring the schema in sync with the repository.

## Recommended fix — run the shipped migrations

1. Install and authenticate the [Supabase CLI](https://supabase.com/docs/reference/cli/usage).
2. Link the CLI to your project (local or remote) if you have not already: `supabase link --project-ref <project-ref>`.
3. From the repository root apply every migration:
   ```bash
   supabase db reset
   # or, to apply only pending migrations
   supabase migration up
   ```
   This will run the migrations under `supabase/migrations/`, including `20241010123000_bias_tracking_storage.sql` and `20251001100000_bias_state_refresh.sql`, which provision the table, helper view, RPCs, index, and RLS policies required by the app.

## Manual SQL deployment

If you cannot run the CLI, execute the equivalent SQL manually (via the Supabase SQL editor or `psql`).

```sql
-- Ensure enum types exist
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

-- Core table
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

CREATE UNIQUE INDEX IF NOT EXISTS bias_state_active_day_key
  ON public.bias_state (day_key, active)
  WHERE active;

-- Helper view for read fallbacks
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

-- RPC used by the app
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

GRANT EXECUTE ON FUNCTION public.get_current_bias(date) TO anon;
GRANT EXECUTE ON FUNCTION public.get_current_bias(date) TO authenticated;

-- Row level security
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
```

## Verification queries

After the migrations or manual SQL complete, confirm the schema objects exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'bias_state';

SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public' AND table_name = 'v_current_bias';

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'get_current_bias';
```

Once these checks return rows, reload the dashboard—the bias tracking banner should disappear and the RPC call will succeed.
