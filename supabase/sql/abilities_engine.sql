-- Additive ability engine foundation. Apply after progression.sql.
-- No existing tables are dropped; the existing cast_ability RPC shape is retained.

alter table public.ability_catalog
  add column if not exists display_name text,
  add column if not exists description text,
  add column if not exists icon text,
  add column if not exists usage_limit integer,
  add column if not exists usage_scope text not null default 'user',
  add column if not exists min_level integer not null default 0,
  add column if not exists input_schema jsonb not null default '[]'::jsonb,
  add column if not exists eligibility jsonb not null default '{}'::jsonb,
  add column if not exists effect_config jsonb not null default '{}'::jsonb,
  add column if not exists workflow text not null default 'instant',
  add column if not exists notification_templates jsonb not null default '{}'::jsonb;

alter table public.ability_casts
  add column if not exists status text not null default 'succeeded',
  add column if not exists caster_display_name text,
  add column if not exists caster_camp text,
  add column if not exists started_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists committed_at timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists error_message text;

create table if not exists public.ability_effects (
  id bigint generated always as identity primary key,
  ability_id text not null references public.ability_catalog(ability_id),
  cast_id bigint references public.ability_casts(id) on delete cascade,
  caster_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete cascade,
  target_camp text,
  status text not null default 'active',
  trigger_type text,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  consumed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.ability_notifications (
  id bigint generated always as identity primary key,
  cast_id bigint references public.ability_casts(id) on delete cascade,
  effect_id bigint references public.ability_effects(id) on delete cascade,
  template_key text not null,
  template text not null,
  audience text not null,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_camp text,
  variables jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ability_effects enable row level security;
alter table public.ability_notifications enable row level security;
drop policy if exists "Users read relevant effects" on public.ability_effects;
create policy "Users read relevant effects" on public.ability_effects for select using (
  auth.uid() = caster_user_id or auth.uid() = target_user_id
);
drop policy if exists "Users read relevant notifications" on public.ability_notifications;
create policy "Users read relevant notifications" on public.ability_notifications for select using (
  auth.uid() = recipient_user_id
);

drop policy if exists "Authenticated users read enabled abilities" on public.ability_catalog;
create policy "Authenticated users read enabled abilities" on public.ability_catalog
  for select using (enabled = true);
grant select on public.ability_catalog to authenticated;
revoke insert, update, delete on public.ability_catalog from anon, authenticated;

create or replace function public.protect_progression_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = new.id and coalesce(auth.jwt()->'app_metadata'->>'role', '') not in ('admin', 'production') then
    new.mana := old.mana;
    new.xp := old.xp;
    new.level := old.level;
    new.camp := old.camp;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_progression_fields on public.profiles;
create trigger protect_progression_fields before update on public.profiles
for each row execute procedure public.protect_progression_fields();

create or replace function public.list_grove_players() returns table(id uuid, display_name text, camp text)
language sql security definer set search_path = public as $$
  select p.id, p.display_name, p.camp from public.profiles p
  where auth.uid() is not null order by p.display_name;
$$;
revoke all on function public.list_grove_players() from public;
grant execute on function public.list_grove_players() to authenticated;

insert into public.ability_catalog (
  ability_id, mana_cost, display_name, description, icon, usage_limit, usage_scope,
  input_schema, workflow, effect_config, eligibility, notification_templates
) values
('ability_telegrab', 25, 'Telegrab', 'Tell Production to retrieve an item from another camp.', '/assets/abilities/telegrab_icon.webp', 1, 'user', '[{"key":"target_player","label":"Target player","type":"player","required":true},{"key":"item","label":"Item","type":"item","required":true}]', 'commit', '{}', '{}', '{"CAST_TO_PRODUCTION":"[display_name] telegrabbed a [item] from [target_player].","COMMIT_SUCCESS":"Weird... something''s gone missing from your camp."}'),
('ability_hivemind', 35, 'Hivemind', 'Plan an event that everyone has to do in the center.', '/assets/abilities/hive_mind_icon.webp', 1, 'camp', '[{"key":"assigned_camp","label":"Assigned camp","type":"camp","required":true}]', 'ready', '{}', '{"achievement":"veteran_camper"}', '{"CAST_TO_PRODUCTION":"[assigned_camp] is planning an event.","READY_TO_ALL":"[assigned_camp] casts Hivemind. Gather the campers in the center."}'),
('ability_compulsion', 25, 'Compulsion', 'Let everyone know that you are the highest-level Grove member.', '/assets/abilities/compulsion_icon.webp', 1, 'user', '[]', 'instant', '{}', '{"type":"highest_level"}', '{"CAST_TO_ALL":"[display_name] is at the market. He''s literally the best grove member out there. Maybe if you give him something good he''ll think you''re cool!"}'),
('ability_spree', 125, 'Spree', 'Everything they purchase is 1 can for the next minute.', '/assets/abilities/spree_icon.webp', 1, 'camp', '[]', 'instant', '{"duration_seconds":60}', '{}', '{"CAST_TO_PRODUCTION":"[display_name] has cast [spell_name]. [spell_description]","EFFECT_EXPIRED":"[display_name]''s Spree is over."}'),
('ability_conjure', 50, 'Conjure', 'Summon an NPC to follow and assist the caster for 15 minutes.', '/assets/abilities/conjure_icon.webp', 1, 'user', '[{"key":"npc","label":"NPC","type":"npc","required":true}]', 'instant', '{"duration_seconds":900}', '{}', '{"CAST_TO_PRODUCTION":"[display_name] has cast [spell_name]. [spell_description]","EFFECT_EXPIRED":"[display_name]''s summoning spell has ended. Return to your normal duties."}'),
('ability_low_alch', 5, 'Low Alch', 'Return a card for 1 can.', '/assets/abilities/low_alch_icon.png', null, 'user', '[]', 'instant', '{}', '{}', '{"CAST_TO_PRODUCTION":"[display_name] has cast [spell_name]. [spell_description]"}'),
('ability_high_alch', 35, 'High Alch', 'Return a card for its original value.', '/assets/abilities/high_alch_icon.png', 3, 'user', '[{"key":"item","label":"Card","type":"item","required":true}]', 'instant', '{}', '{"achievement":"shopaholic"}', '{"CAST_TO_PRODUCTION":"[display_name] has cast [spell_name]. [spell_description]"}'),
('ability_superheat', 10, 'Superheat', 'Exchange one item for another result.', '/assets/abilities/superheat_icon.png', 1, 'user', '[{"key":"item_1","label":"Item 1","type":"item","required":true},{"key":"item_2","label":"Desired result","type":"item","required":true}]', 'instant', '{}', '{}', '{"CAST_TO_PRODUCTION":"[display_name] has cast [spell_name]. They are exchanging [item_1] for [item_2]."}'),
('ability_teleother', 25, 'Teleother', 'Move another camper to a chosen location.', '/assets/abilities/teleother_icon.png', 1, 'camp', '[{"key":"target_player","label":"Target player","type":"player","required":true},{"key":"location","label":"Desired location","type":"location","required":true}]', 'instant', '{}', '{}', '{"CAST_TO_PRODUCTION":"[display_name] has cast [spell_name]. Move [target_player] to [location]."}'),
('ability_vengeance', 25, 'Vengeance', 'The next spell that targets the caster is reflected back.', '/assets/abilities/vengeance_icon.png', 1, 'user', '[]', 'instant', '{"duration_seconds":3600,"target":"caster","trigger_type":"targeted_ability"}', '{"achievement":"high_score"}', '{"CAST_TO_ALL":"[display_name] has armed [spell_name]. [spell_description]","REFLECTED":"Your spell was reflected by [target_player]."}'),
('ability_ice_barrage', 25, 'Ice Barrage', 'Freeze a player for five minutes.', '/assets/abilities/ice_barrage_icon.png', 1, 'user', '[{"key":"target_player","label":"Target player","type":"player","required":true}]', 'instant', '{"duration_seconds":300}', '{}', '{"CAST_TO_TARGET":"[display_name] has frozen you with [spell_name]. Do NOT move for 5 minutes.","CAST_TO_PRODUCTION":"[display_name] has cast [spell_name]. [spell_description].","EFFECT_EXPIRED":"[target_player] has thawed."}'),
('ability_drop_party', 50, 'Drop Party', 'Gather the NPCs and value items for a drop party in the center.', '/assets/abilities/drop_party_icon.png', 1, 'camp', '[]', 'ready', '{}', '{}', '{"CAST_TO_PRODUCTION":"[display_name] has cast [spell_name]. [spell_description].","READY_TO_ALL":"The drop party is happening in the center."}'),
('ability_love_blast', 25, 'Love Blast', 'Make your target serenade the caster.', '/assets/abilities/love_potion_icon.webp', 1, 'user', '[{"key":"target_player","label":"Target player","type":"player","required":true}]', 'instant', '{}', '{}', '{"CAST_TO_TARGET":"[display_name] hit YOU with [spell_name]. [spell_description]"}'),
('ability_necromancy', 25, 'Necromancy', 'Make your target walk like a zombie through each camp.', '/assets/abilities/necromancy_icon.webp', 1, 'user', '[{"key":"target_player","label":"Target player","type":"player","required":true}]', 'instant', '{}', '{}', '{"CAST_TO_TARGET":"[display_name] hit YOU with [spell_name]. [spell_description]"}')
on conflict (ability_id) do update set
  mana_cost = excluded.mana_cost, display_name = excluded.display_name, description = excluded.description,
  icon = excluded.icon, usage_limit = excluded.usage_limit, usage_scope = excluded.usage_scope,
  input_schema = excluded.input_schema, workflow = excluded.workflow, effect_config = excluded.effect_config,
  eligibility = excluded.eligibility, notification_templates = excluded.notification_templates;

create or replace function public.cast_ability(
  ability_id_value text,
  target_user_id_value uuid default null,
  target_camp_value text default null,
  target_npc_value text default null,
  target_location_value text default null,
  variables_value jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  definition ability_catalog%rowtype;
  caster profiles%rowtype;
  target_profile profiles%rowtype;
  cast_id bigint;
  effect_id bigint;
  reactive_effect_id bigint;
  remaining integer;
  required_input jsonb;
  required_key text;
  usage_count integer;
  duration_seconds integer;
  cast_status text;
  now_value timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into definition from ability_catalog where ability_id = ability_id_value and enabled;
  if not found then raise exception 'Ability is unavailable'; end if;
  select * into caster from profiles where id = auth.uid();
  if not found then raise exception 'Profile is unavailable'; end if;
  if coalesce(caster.level, 0) < definition.min_level then raise exception 'Level requirement not met'; end if;

  if definition.eligibility ? 'achievement' and not exists (
    select 1 from user_achievements ua
      where ua.user_id = auth.uid() and ua.achievement_id = definition.eligibility->>'achievement'
        and ua.completed_at is not null
  ) then raise exception 'Achievement requirement not met'; end if;

  if (definition.eligibility->>'type') = 'highest_level' and exists (
    select 1 from profiles p where coalesce(p.level, 0) > coalesce(caster.level, 0)
  ) then raise exception 'Only the highest-level Grove member can cast this ability'; end if;

  for required_input in select value from jsonb_array_elements(definition.input_schema)
    where coalesce((value->>'required')::boolean, false)
  loop
    required_key := required_input->>'key';
    if required_key is null or not (variables_value ? required_key) then
      raise exception 'Missing required ability input: %', coalesce(required_input->>'label', required_key);
    end if;
  end loop;

  if target_user_id_value is not null then
    select * into target_profile from profiles where id = target_user_id_value;
    if not found then raise exception 'Target player is invalid'; end if;
  end if;

  if definition.usage_limit is not null then
    if definition.usage_scope = 'camp' then
      select count(*) into usage_count from ability_casts
        where ability_id = ability_id_value and caster_camp = caster.camp and status <> 'canceled';
    else
      select count(*) into usage_count from ability_casts
        where ability_id = ability_id_value and user_id = auth.uid() and status <> 'canceled';
    end if;
    if usage_count >= definition.usage_limit then raise exception 'Ability usage limit reached'; end if;
  end if;

  update profiles set mana = mana - definition.mana_cost
    where id = auth.uid() and coalesce(mana, 0) >= definition.mana_cost
    returning mana into remaining;
  if remaining is null then raise exception 'Not enough mana'; end if;

  duration_seconds := nullif((definition.effect_config->>'duration_seconds')::integer, 0);
  cast_status := case when definition.workflow in ('ready', 'commit') then 'pending' else 'succeeded' end;
  insert into ability_casts (
    user_id, ability_id, target_user_id, target_camp, target_npc, target_location,
    variables, mana_cost, status, caster_display_name, caster_camp, started_at,
    expires_at, completed_at
  ) values (
    auth.uid(), ability_id_value, target_user_id_value, target_camp_value, target_npc_value,
    target_location_value, variables_value, definition.mana_cost, cast_status,
    caster.display_name, caster.camp, now_value, now_value + make_interval(secs => duration_seconds),
    case when cast_status = 'succeeded' and duration_seconds is null then now_value else null end
  ) returning id into cast_id;

  select id into reactive_effect_id from ability_effects
    where target_user_id = auth.uid() and status = 'active'
      and trigger_type = 'targeted_ability'
      and (expires_at is null or expires_at > now_value)
    order by started_at limit 1;
  if reactive_effect_id is not null then
    update ability_effects set status = 'consumed', consumed_at = now_value where id = reactive_effect_id;
    update ability_casts set status = 'reflected', completed_at = now_value where id = cast_id;
    insert into ability_notifications (cast_id, effect_id, template_key, template, audience, recipient_user_id, variables)
      values (cast_id, reactive_effect_id, 'REFLECTED', 'Your spell was reflected by [target_player].', 'user', auth.uid(),
        jsonb_build_object('target_player', caster.display_name, 'reflected_ability', definition.display_name));
    return jsonb_build_object('cast_id', cast_id, 'status', 'reflected', 'mana', remaining);
  end if;

  if duration_seconds is not null or (definition.effect_config->>'trigger_type') is not null then
    insert into ability_effects (
      ability_id, cast_id, caster_user_id, target_user_id, target_camp, trigger_type,
      started_at, expires_at, metadata
    ) values (
      ability_id_value, cast_id, auth.uid(),
      case when definition.effect_config->>'target' = 'caster' then auth.uid() else target_user_id_value end,
      target_camp_value, definition.effect_config->>'trigger_type', now_value,
      now_value + make_interval(secs => duration_seconds), variables_value
    ) returning id into effect_id;
  end if;

  insert into ability_notifications (cast_id, effect_id, template_key, template, audience, recipient_user_id, recipient_camp, variables)
  select cast_id, effect_id, key, value, case
    when key like '%TARGET%' then 'user' when key like '%CAMP%' then 'camp'
    when key like '%ALL%' then 'all' else 'production' end,
    case when key like '%TARGET%' then target_user_id_value else null end,
    case when key like '%CAMP%' then caster.camp else null end,
    jsonb_build_object('display_name', caster.display_name, 'spell_name', definition.display_name,
      'spell_description', definition.description, 'target_player', target_profile.display_name)
  from jsonb_each_text(definition.notification_templates)
  where value is not null and value <> '';

  return jsonb_build_object('cast_id', cast_id, 'effect_id', effect_id, 'mana', remaining, 'status', cast_status);
end;
$$;

create or replace function public.commit_ability(cast_id_value bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare updated_cast ability_casts%rowtype;
begin
  if coalesce(auth.jwt()->'app_metadata'->>'role', '') not in ('admin', 'production') then
    raise exception 'Only production can commit an ability';
  end if;
  update ability_casts set status = 'succeeded', committed_at = now(), completed_at = now()
    where id = cast_id_value and status = 'pending' returning * into updated_cast;
  if not found then raise exception 'Ability is not awaiting commit'; end if;
  return jsonb_build_object('cast_id', updated_cast.id, 'status', updated_cast.status);
end;
$$;

create or replace function public.expire_ability_effects() returns integer
language plpgsql security definer set search_path = public as $$
declare expired_count integer;
begin
  if auth.role() <> 'service_role' and coalesce(auth.jwt()->'app_metadata'->>'role', '') not in ('admin', 'production') then
    raise exception 'Only production can expire ability effects';
  end if;
  with expired as (
    update ability_effects
      set status = 'expired'
      where status = 'active' and expires_at is not null and expires_at <= now()
      returning id, cast_id, ability_id, target_user_id, metadata
  )
  insert into ability_notifications (cast_id, effect_id, template_key, template, audience, recipient_user_id, variables)
    select expired.cast_id, expired.id, 'EFFECT_EXPIRED',
      coalesce(c.notification_templates->>'EFFECT_EXPIRED', '[spell_name] has expired.'),
      case when expired.target_user_id is null then 'production' else 'user' end,
      expired.target_user_id,
      expired.metadata
    from expired join ability_catalog c on c.ability_id = expired.ability_id;
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;

create or replace function public.claim_ability_notifications(limit_value integer default 50)
returns setof ability_notifications
language sql security definer set search_path = public as $$
  with claimed as (
    select id from ability_notifications
      where status = 'pending'
      order by created_at
      for update skip locked
      limit greatest(1, least(limit_value, 100))
  )
  update ability_notifications n
    set status = 'processing'
    from claimed
    where n.id = claimed.id
    returning n.*;
$$;

revoke all on function public.claim_ability_notifications(integer) from public;
grant execute on function public.claim_ability_notifications(integer) to service_role;

grant execute on function public.cast_ability(text, uuid, text, text, text, jsonb) to authenticated;
grant execute on function public.commit_ability(bigint) to authenticated;
grant execute on function public.expire_ability_effects() to authenticated;