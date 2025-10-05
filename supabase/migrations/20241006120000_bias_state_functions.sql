create or replace function public.get_current_bias(target_day date)
returns public.bias_state
language sql
security definer
set search_path = public, extensions
as $$
  select bs
  from public.bias_state as bs
  where bs.day_key = target_day
    and bs.active
  order by bs.selected_at desc
  limit 1;
$$;

grant execute on function public.get_current_bias(date) to anon;
grant execute on function public.get_current_bias(date) to authenticated;

create or replace function public.set_bias_state(
  target_day date,
  target_bias public.bias_enum,
  target_market_state public.market_state_enum default null,
  target_confidence text default null,
  target_tags text[] default null
)
returns public.bias_state
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_selected_by uuid := auth.uid();
  v_inserted public.bias_state;
begin
  if v_selected_by is null then
    raise exception 'Missing authenticated user for bias selection';
  end if;

  update public.bias_state
     set active = false
   where day_key = target_day
     and active;

  insert into public.bias_state (
    day_key,
    bias,
    market_state,
    confidence,
    tags,
    selected_by,
    active
  )
  values (
    target_day,
    target_bias,
    target_market_state,
    target_confidence,
    case when target_tags is null then null else to_jsonb(target_tags) end,
    v_selected_by,
    true
  )
  returning * into v_inserted;

  return v_inserted;
end;
$$;

grant execute on function public.set_bias_state(date, public.bias_enum, public.market_state_enum, text, text[]) to authenticated;
