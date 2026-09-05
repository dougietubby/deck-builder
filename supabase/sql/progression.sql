-- Progression foundation. Apply after create_profiles.sql.
alter table public.profiles add column if not exists mana integer not null default 100;
alter table public.profiles add column if not exists equipped_avatar text not null default 'default';

create table if not exists public.user_abilities (user_id uuid references auth.users(id) on delete cascade, ability_id text not null, unlocked_at timestamptz not null default now(), primary key (user_id, ability_id));
create table if not exists public.user_achievements (user_id uuid references auth.users(id) on delete cascade, achievement_id text not null, progress integer not null default 0, completed_at timestamptz, primary key (user_id, achievement_id));
create table if not exists public.user_quests (user_id uuid references auth.users(id) on delete cascade, quest_id text not null, completed_at timestamptz not null default now(), primary key (user_id, quest_id));
create table if not exists public.user_rewards (user_id uuid references auth.users(id) on delete cascade, reward_type text not null, reward_id text not null, awarded_at timestamptz not null default now(), primary key (user_id, reward_type, reward_id));
create table if not exists public.ability_casts (id bigint generated always as identity primary key, user_id uuid references auth.users(id) on delete set null, ability_id text not null, target_user_id uuid, target_camp text, target_npc text, target_location text, variables jsonb not null default '{}'::jsonb, mana_cost integer not null, created_at timestamptz not null default now());
create table if not exists public.ability_catalog (ability_id text primary key, mana_cost integer not null, enabled boolean not null default true);
insert into public.ability_catalog (ability_id, mana_cost) values
  ('ability_telegrab', 25), ('ability_hivemind', 35), ('ability_compulsion', 40), ('ability_spree', 30), ('ability_conjure', 45),
  ('ability_low_alch', 10), ('ability_high_alch', 20), ('ability_superheat', 25), ('ability_teleother', 30), ('ability_vengeance', 50),
  ('ability_ice_barrage', 40), ('ability_drop_party', 35), ('ability_love_blast', 20), ('ability_necromancy', 60)
on conflict (ability_id) do update set mana_cost = excluded.mana_cost;

alter table public.user_abilities enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_quests enable row level security;
alter table public.ability_casts enable row level security;
alter table public.user_rewards enable row level security;
drop policy if exists "Users read own abilities" on public.user_abilities;
drop policy if exists "Users read own achievements" on public.user_achievements;
drop policy if exists "Users read own quests" on public.user_quests;
drop policy if exists "Users read own casts" on public.ability_casts;
drop policy if exists "Users read own rewards" on public.user_rewards;
create policy "Users read own abilities" on public.user_abilities for select using (auth.uid() = user_id);
create policy "Users read own achievements" on public.user_achievements for select using (auth.uid() = user_id);
create policy "Users read own quests" on public.user_quests for select using (auth.uid() = user_id);
create policy "Users read own casts" on public.ability_casts for select using (auth.uid() = user_id);
create policy "Users read own rewards" on public.user_rewards for select using (auth.uid() = user_id);
revoke all on public.ability_catalog from anon, authenticated;

create or replace function public.award_xp(amount_value integer, reason_value text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare result profiles;
begin
  if amount_value <= 0 then raise exception 'XP amount must be positive'; end if;
  update profiles set xp = coalesce(xp, 0) + amount_value, level = floor((coalesce(xp, 0) + amount_value) / 100) where id = auth.uid() returning * into result;
  return jsonb_build_object('xp', result.xp, 'level', result.level);
end; $$;

create or replace function public.award_mana(amount_value integer) returns integer language plpgsql security definer set search_path = public as $$ declare result integer; begin update profiles set mana = coalesce(mana, 0) + amount_value where id = auth.uid() returning mana into result; return result; end; $$;
create or replace function public.spend_mana(amount_value integer) returns integer language plpgsql security definer set search_path = public as $$ declare result integer; begin update profiles set mana = coalesce(mana, 0) - amount_value where id = auth.uid() and coalesce(mana, 0) >= amount_value returning mana into result; if result is null then raise exception 'Not enough mana'; end if; return result; end; $$;
create or replace function public.cast_ability(ability_id_value text, target_user_id_value uuid default null, target_camp_value text default null, target_npc_value text default null, target_location_value text default null, variables_value jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare cost integer; remaining integer;
begin
  select mana_cost into cost from ability_catalog where ability_id = ability_id_value and enabled;
  if cost is null then raise exception 'Ability is unavailable'; end if;
  update profiles set mana = mana - cost where id = auth.uid() and coalesce(mana, 0) >= cost returning mana into remaining;
  if remaining is null then raise exception 'Not enough mana'; end if;
  insert into ability_casts(user_id, ability_id, target_user_id, target_camp, target_npc, target_location, variables, mana_cost) values(auth.uid(), ability_id_value, target_user_id_value, target_camp_value, target_npc_value, target_location_value, variables_value, cost);
  return jsonb_build_object('mana', remaining, 'mana_cost', cost);
end; $$;
create or replace function public.complete_quest(quest_id_value text) returns boolean language plpgsql security definer set search_path = public as $$ begin insert into user_quests(user_id, quest_id) values(auth.uid(), quest_id_value) on conflict do nothing; if not found then raise exception 'Quest already completed'; end if; return true; end; $$;

create or replace function public.complete_achievement(achievement_id_value text, reward_type_value text default null, reward_id_value text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare inserted boolean; reward_inserted boolean;
begin
  insert into user_achievements(user_id, achievement_id, completed_at) values(auth.uid(), achievement_id_value, now()) on conflict (user_id, achievement_id) do nothing;
  inserted := found;
  if not inserted then raise exception 'Achievement already completed'; end if;
  if reward_type_value is not null and reward_id_value is not null then
    insert into user_rewards(user_id, reward_type, reward_id) values(auth.uid(), reward_type_value, reward_id_value) on conflict do nothing;
    reward_inserted := found;
    if reward_type_value = 'ability' and reward_inserted then
      insert into user_abilities(user_id, ability_id) values(auth.uid(), reward_id_value) on conflict do nothing;
    end if;
  end if;
  return jsonb_build_object('completed', true, 'reward_awarded', coalesce(reward_inserted, false));
end; $$;
