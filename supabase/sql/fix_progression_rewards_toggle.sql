-- Server-side development toggle for new XP/mana rewards.
-- Existing profiles, progression values, and quest/achievement history are unchanged.

create table if not exists public.grove_runtime_config (
  id boolean primary key default true check (id),
  progression_rewards_enabled boolean not null default false
);

insert into public.grove_runtime_config (id, progression_rewards_enabled)
values (true, false)
on conflict (id) do nothing;

alter table public.grove_runtime_config enable row level security;
revoke all on public.grove_runtime_config from anon, authenticated;

create or replace function public.award_xp(amount_value integer, reason_value text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  result profiles;
  rewards_enabled boolean;
begin
  if amount_value <= 0 then raise exception 'XP amount must be positive'; end if;
  select progression_rewards_enabled into rewards_enabled from grove_runtime_config where id = true;
  if not coalesce(rewards_enabled, false)
    and not exists (select 1 from profiles where id = auth.uid() and is_production = true) then
    select * into result from profiles where id = auth.uid();
    if not found then raise exception 'Profile is unavailable'; end if;
    return jsonb_build_object('xp', result.xp, 'level', result.level, 'awarded', false);
  end if;
  perform set_config('app.grove_progression_reward', 'true', true);
  update profiles
    set xp = coalesce(xp, 0) + amount_value,
        level = floor((coalesce(xp, 0) + amount_value) / 100)
    where id = auth.uid()
    returning * into result;
  if not found then raise exception 'Profile is unavailable'; end if;
  return jsonb_build_object('xp', result.xp, 'level', result.level, 'awarded', true);
end;
$$;

create or replace function public.award_mana(amount_value integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  result integer;
  rewards_enabled boolean;
begin
  if amount_value <= 0 then raise exception 'Mana amount must be positive'; end if;
  select progression_rewards_enabled into rewards_enabled from grove_runtime_config where id = true;
  if not coalesce(rewards_enabled, false)
    and not exists (select 1 from profiles where id = auth.uid() and is_production = true) then
    select mana into result from profiles where id = auth.uid();
    if result is null then raise exception 'Profile is unavailable'; end if;
    return result;
  end if;
  perform set_config('app.grove_progression_reward', 'true', true);
  update profiles set mana = coalesce(mana, 0) + amount_value
    where id = auth.uid() returning mana into result;
  if not found then raise exception 'Profile is unavailable'; end if;
  return result;
end;
$$;

grant execute on function public.award_xp(integer, text) to authenticated;
grant execute on function public.award_mana(integer) to authenticated;

-- Toggle examples:
-- update public.grove_runtime_config set progression_rewards_enabled = false where id = true;
-- update public.grove_runtime_config set progression_rewards_enabled = true where id = true;