# Migration Execution Status

Attempts were made to run the Supabase migrations as requested. However, the Supabase CLI is not available in the current environment (`supabase --version` returns a command-not-found error), so the migrations could not be executed locally. Additionally, no `SUPABASE_DB_URL` or remote project configuration was provided, preventing direct execution of SQL via `psql`.

To complete the requested steps, please ensure that:

1. The Supabase CLI is installed and authenticated against the target project.
2. `SUPABASE_DB_URL` (or the Supabase project reference) is supplied so the CLI/`psql` can connect to the correct database.

## SQL to Apply

Run the following SQL against your Supabase project's Postgres database (adapt schema names if your project differs):

```sql
-- Ensure extensions schema and uuid function
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

-- Create bias_state table
CREATE TABLE public.bias_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model_id text NOT NULL,
  bias jsonb NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bias_state_user_id ON public.bias_state(user_id);
CREATE INDEX IF NOT EXISTS idx_bias_state_model_id ON public.bias_state(model_id);

-- Enable RLS
ALTER TABLE public.bias_state ENABLE ROW LEVEL SECURITY;

-- RLS policies (minimal, per Supabase best practices)
CREATE POLICY "Bias read" ON public.bias_state FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Bias insert" ON public.bias_state FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Bias update" ON public.bias_state FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Bias delete" ON public.bias_state FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);
```

## Command Sequence

After configuring the Supabase CLI and database credentials, run these commands from the project root:

```bash
supabase login
supabase db remote set <SUPABASE_DB_URL>  # only if the remote is not already configured
supabase migration status
supabase migration run
```

If you prefer to run the SQL directly (or cannot install the CLI), execute:

```bash
psql "$SUPABASE_DB_URL" -f path/to/the/sql-file.sql
```

## Verification Queries

After applying the SQL/migrations, run the following queries to confirm everything is in place:

```sql
-- Check table exists
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='bias_state';

-- Inspect rows
SELECT * FROM public.bias_state LIMIT 5;

-- Confirm RLS enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname='bias_state';

-- Confirm policies
SELECT polname, polcmd, polroles::text, polqual::text, polwithcheck::text FROM pg_policy WHERE polrelid = 'public.bias_state'::regclass;
```

## Runtime API Checks

With a valid user's `access_token`, hit the deployed Edge Function to verify read/write behaviour (replace placeholders with real values):

```bash
curl -H "Authorization: Bearer <TOKEN>" "<FUNCTION_URL>/bias-state?model_id=abc"

curl -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"model_id":"abc","bias":{"value":0.1},"metadata":{}}' \
  "<FUNCTION_URL>/bias-state"
```

## Troubleshooting Notes

* Ensure `pgcrypto` is installed in the `extensions` schema (the SQL above handles this).
* If your project prefers `uuid-ossp`, replace `gen_random_uuid()` with `uuid_generate_v4()` and install the `uuid-ossp` extension instead.
* If migrations succeed but the Edge Function still reports missing bias tracking, confirm `SUPABASE_URL` and keys point to the same project where you applied the SQL.
* If the Supabase CLI is unavailable, run the SQL through `psql` using `SUPABASE_DB_URL` or via the Supabase SQL editor.
* Let me know if you would like a migration file generated with the SQL above—I'm happy to create it.

Once the database connection is available, the verification queries for `bias_state` existence, RLS policies, and extension setup can be run against the configured database.
