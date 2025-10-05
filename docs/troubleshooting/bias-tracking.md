# Bias tracking Supabase schema

The trading dashboard reads and writes the current bias through Supabase. All of the SQL objects it depends on
(functions, views, tables) live in the migrations contained in `supabase/migrations/`.

When those migrations have not been applied you will see a yellow banner in the app that reads:

```
Bias tracking configuration missing
Bias state storage is not available. Please run the latest Supabase migrations to enable bias tracking.
```

This is expected – it means the local/linked Supabase project is still missing the bias schema. Apply the migrations to
enable the feature:

1. Install the [Supabase CLI](https://supabase.com/docs/reference/cli/usage) if you have not already.
2. Start your local stack (or link a remote project):
   ```bash
   supabase start
   ```
3. Apply the migrations that ship with this repo:
   ```bash
   supabase db reset
   ```
   This command re-applies every SQL migration in `supabase/migrations/` against the linked database, including
   [`20241010123000_bias_tracking_storage.sql`](../../supabase/migrations/20241010123000_bias_tracking_storage.sql)
   which provisions the bias storage table, unique index, and row-level security policies.
4. Regenerate the generated types if you are running locally:
   ```bash
   supabase gen types typescript --project-id "$(supabase status -o json | jq -r '.project.id')" --schema public > src/integrations/supabase/types.ts
   ```
   The `jq` call extracts the project id from the CLI output; feel free to hard-code the id if you prefer. (You can also
   add an npm script such as `generate:supabase-types` to wrap this command.)

After the migrations finish successfully refresh the dashboard. The warning disappears and you can save bias states.

If you are running against a remote Supabase project make sure it is linked with `supabase link --project-ref <ref>` and
rerun `supabase db push` to apply only the new migrations.

## Manual SQL deployment & verification

Want to run the SQL by hand? The migration mentioned above contains the following key steps:

- Ensure the `bias_enum` and `market_state_enum` enums exist.
- Create the `public.bias_state` table with the columns used by the app (day key, bias enums, optional tags, etc.).
- Enable row-level security and add permissive policies so authenticated users can read and persist the shared bias state.

You can run that file manually with either approach:

```bash
# Apply the SQL locally with the Supabase CLI
supabase db push

# ...or connect with psql and run the file manually
psql "$SUPABASE_DB_URL" -f supabase/migrations/20241010123000_bias_tracking_storage.sql
```

After the migration succeeds, verify the schema:

```sql
-- Confirm the table exists and shows the expected columns
\d public.bias_state

-- Check the RLS policies
SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE tablename = 'bias_state';

-- Optional: confirm you can read/write a row
SELECT * FROM public.bias_state LIMIT 1;
```

Once those checks succeed, reload the dashboard—the banner disappears and bias tracking is ready to go.
