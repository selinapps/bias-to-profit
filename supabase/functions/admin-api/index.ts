import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type PromoteCoachBody = {
  userId?: string;
  cohorts?: string[] | string;
  coachPresetKey?: string;
  presetKey?: string;
};

const normalizeCohorts = (cohorts: PromoteCoachBody['cohorts']) => {
  const raw = Array.isArray(cohorts) ? cohorts : String(cohorts ?? '').split(',');

  return [...new Set(raw.map((code) => code.trim()).filter(Boolean))];
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

async function handleUsersPromoteCoach(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Admin API is missing Supabase service configuration' }, 500);
  }

  const body = (await req.json()) as PromoteCoachBody;
  const userId = body.userId;
  const cohorts = normalizeCohorts(body.cohorts);
  const presetKey = body.coachPresetKey ?? body.presetKey ?? 'generic';

  if (!userId) {
    return json({ error: 'userId is required' }, 400);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });

  const { data: authUser } = authHeader
    ? await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    : { data: { user: null } };

  const { data, error } = await supabase.rpc('promote_coach_with_cohorts', {
    p_user_id: userId,
    p_cohort_codes: cohorts,
    p_preset_key: presetKey,
    p_actor_id: authUser.user?.id ?? null,
  });

  if (error) {
    const message = error.message?.includes('owned by another coach')
      ? error.message
      : `Unable to promote coach: ${error.message}`;

    return json({ error: message }, error.message?.includes('owned by another coach') ? 409 : 400);
  }

  return json({ profile: data });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (req.method === 'POST' && url.pathname.endsWith('/users/promote-coach')) {
    return handleUsersPromoteCoach(req);
  }

  return json({ error: 'Not found' }, 404);
});
