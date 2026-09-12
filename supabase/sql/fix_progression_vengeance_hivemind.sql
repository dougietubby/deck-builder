-- Scoped fixes for progression rewards, Vengeance reflection, and Hivemind READY text.
-- Apply after fix_production_usage_limit_bypass.sql.
-- No scheduler, worker, idempotency, mana-cost, or usage-limit configuration changes.

create or replace function public.protect_profile_authority_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    if tg_op = 'INSERT' then
      new.mana := coalesce(new.mana, 100);
      new.xp := coalesce(new.xp, 0);
      new.level := coalesce(new.level, 1);
      new.camp := null;
      new.is_production := false;
    else
      if current_setting('app.grove_ability_cast', true) is distinct from 'true'
        and current_setting('app.grove_progression_reward', true) is distinct from 'true' then
        new.mana := old.mana;
      end if;
      if current_setting('app.grove_progression_reward', true) is distinct from 'true' then
        new.xp := old.xp;
        new.level := old.level;
      end if;
      new.camp := old.camp;
      new.is_production := old.is_production;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.protect_progression_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = new.id
    and current_setting('app.grove_ability_cast', true) is distinct from 'true'
    and current_setting('app.grove_progression_reward', true) is distinct from 'true'
    and coalesce(auth.jwt()->'app_metadata'->>'role', '') not in ('admin', 'production') then
    new.mana := old.mana;
    new.xp := old.xp;
    new.level := old.level;
    new.camp := old.camp;
  end if;
  return new;
end;
$$;

create or replace function public.award_xp(amount_value integer, reason_value text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result profiles;
begin
  if amount_value <= 0 then raise exception 'XP amount must be positive'; end if;
  perform set_config('app.grove_progression_reward', 'true', true);
  update profiles
    set xp = coalesce(xp, 0) + amount_value,
        level = floor((coalesce(xp, 0) + amount_value) / 100)
    where id = auth.uid()
    returning * into result;
  if not found then raise exception 'Profile is unavailable'; end if;
  return jsonb_build_object('xp', result.xp, 'level', result.level);
end;
$$;

create or replace function public.award_mana(amount_value integer)
returns integer language plpgsql security definer set search_path = public as $$
declare result integer;
begin
  if amount_value <= 0 then raise exception 'Mana amount must be positive'; end if;
  perform set_config('app.grove_progression_reward', 'true', true);
  update profiles set mana = coalesce(mana, 0) + amount_value
    where id = auth.uid() returning mana into result;
  if not found then raise exception 'Profile is unavailable'; end if;
  return result;
end;
$$;

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
  limit_enabled boolean;
  limit_type text;
  limit_count integer;
  target_display_name_value text;
  now_value timestamptz := now();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into definition from ability_catalog where ability_id = ability_id_value and enabled;
  if not found then raise exception 'Ability is unavailable'; end if;
  select * into caster from profiles where id = auth.uid();
  if not found then raise exception 'Profile is unavailable'; end if;
  if not caster.is_production and coalesce(caster.level, 0) < definition.min_level then raise exception 'Level requirement not met'; end if;
  if not caster.is_production and definition.eligibility ? 'achievement' and not exists (
    select 1 from user_achievements ua where ua.user_id = auth.uid()
      and ua.achievement_id = definition.eligibility->>'achievement' and ua.completed_at is not null
  ) then raise exception 'Achievement requirement not met'; end if;
  if not caster.is_production and (definition.eligibility->>'type') = 'highest_level' and exists (
    select 1 from profiles p where coalesce(p.level, 0) > coalesce(caster.level, 0)
  ) then raise exception 'Only the highest-level Grove member can cast this ability'; end if;

  if ability_id_value = 'ability_hivemind' then
    if nullif(caster.camp, '') is null then raise exception 'You must be assigned to a camp before casting Hivemind'; end if;
    variables_value := (variables_value - 'assigned_camp') || jsonb_build_object('assigned_camp', caster.camp);
    target_camp_value := caster.camp;
  end if;

  for required_input in select value from jsonb_array_elements(definition.input_schema)
    where coalesce((value->>'required')::boolean, false)
  loop
    required_key := required_input->>'key';
    if required_key is null or not (variables_value ? required_key)
      or nullif(variables_value->>required_key, '') is null then
      raise exception 'Missing required ability input: %', coalesce(required_input->>'label', required_key);
    end if;
    if required_input->>'type' = 'player' then
      if target_user_id_value is null then raise exception 'A target player is required'; end if;
      if coalesce((required_input->>'exclude_self')::boolean, false) and target_user_id_value = auth.uid() then
        raise exception 'You cannot target yourself with this ability';
      end if;
    end if;
  end loop;

  if target_user_id_value is not null then
    select * into target_profile from profiles where id = target_user_id_value;
    if not found then raise exception 'Target player is invalid'; end if;
  end if;

  limit_enabled := coalesce(definition.usage_limit_enabled, definition.usage_limit is not null);
  limit_type := coalesce(definition.usage_limit_type, definition.usage_scope, 'user');
  limit_count := coalesce(definition.usage_limit_count, definition.usage_limit);
  if not caster.is_production and limit_enabled and limit_count is not null then
    if limit_type = 'camp' then
      select count(*) into usage_count from ability_casts where ability_id = ability_id_value
        and caster_camp = caster.camp and status <> 'canceled';
    else
      select count(*) into usage_count from ability_casts where ability_id = ability_id_value
        and user_id = auth.uid() and status <> 'canceled';
    end if;
    if usage_count >= limit_count then raise exception 'Ability usage limit reached'; end if;
  end if;

  perform set_config('app.grove_ability_cast', 'true', true);
  update profiles set mana = mana - definition.mana_cost
    where id = auth.uid() and coalesce(mana, 0) >= definition.mana_cost returning mana into remaining;
  if remaining is null then raise exception 'Not enough mana'; end if;

  duration_seconds := nullif((definition.effect_config->>'duration_seconds')::integer, 0);
  cast_status := case when definition.workflow in ('ready', 'commit') then 'pending' else 'succeeded' end;
  target_display_name_value := coalesce(target_profile.display_name, target_user_id_value::text);
  insert into ability_casts (
    user_id, ability_id, target_user_id, target_camp, target_npc, target_location,
    variables, mana_cost, status, caster_display_name, caster_camp, started_at, expires_at, completed_at
  ) values (
    auth.uid(), ability_id_value, target_user_id_value, target_camp_value, target_npc_value,
    target_location_value, variables_value, definition.mana_cost, cast_status, caster.display_name,
    caster.camp, now_value, now_value + make_interval(secs => duration_seconds),
    case when cast_status = 'succeeded' and duration_seconds is null then now_value else null end
  ) returning id into cast_id;

  select id into reactive_effect_id from ability_effects
    where target_user_id = target_user_id_value and target_user_id_value is not null
      and status = 'active' and trigger_type = 'targeted_ability'
      and (expires_at is null or expires_at > now_value)
    order by started_at limit 1;
  if reactive_effect_id is not null then
    update ability_effects set status = 'consumed', consumed_at = now_value where id = reactive_effect_id;
    update ability_casts set status = 'reflected', completed_at = now_value where id = cast_id;

    if duration_seconds is not null or (definition.effect_config->>'trigger_type') is not null then
      insert into ability_effects (
        ability_id, cast_id, caster_user_id, caster_display_name, target_user_id, target_display_name,
        target_camp, trigger_type, started_at, expires_at, metadata
      ) values (
        ability_id_value, cast_id, target_user_id_value, target_profile.display_name,
        auth.uid(), caster.display_name, caster.camp, definition.effect_config->>'trigger_type',
        now_value, now_value + make_interval(secs => duration_seconds),
        jsonb_build_object(
          'caster_user_id', target_user_id_value,
          'caster_display_name', target_profile.display_name,
          'target_user_id', auth.uid(),
          'target_display_name', caster.display_name,
          'display_name', target_profile.display_name,
          'target_player', caster.display_name,
          'spell_name', definition.display_name,
          'spell_description', definition.description,
          'ability_id', ability_id_value,
          'reflected', true
        )
      ) returning id into effect_id;
    end if;

    insert into ability_notifications (cast_id, effect_id, template_key, template, audience, recipient_user_id, variables)
    values (
      cast_id, effect_id, 'REFLECTED',
      'Your [spell_name] was reflected by [target_player].', 'user', auth.uid(),
      jsonb_build_object(
        'display_name', target_profile.display_name,
        'spell_name', definition.display_name,
        'spell_description', definition.description,
        'target_player', target_profile.display_name,
        'caster_display_name', target_profile.display_name,
        'target_display_name', caster.display_name,
        'reflected_ability', definition.display_name,
        'reflected', true
      )
    );
    return jsonb_build_object('cast_id', cast_id, 'effect_id', effect_id, 'status', 'reflected', 'mana', remaining);
  end if;

  if duration_seconds is not null or (definition.effect_config->>'trigger_type') is not null then
    insert into ability_effects (
      ability_id, cast_id, caster_user_id, caster_display_name, target_user_id, target_display_name,
      target_camp, trigger_type, started_at, expires_at, metadata
    ) values (
      ability_id_value, cast_id, auth.uid(), caster.display_name,
      case when definition.effect_config->>'target' = 'caster' then auth.uid() else target_user_id_value end,
      case when definition.effect_config->>'target' = 'caster' then caster.display_name else target_display_name_value end,
      target_camp_value, definition.effect_config->>'trigger_type', now_value,
      now_value + make_interval(secs => duration_seconds),
      jsonb_build_object(
        'caster_user_id', auth.uid(), 'caster_display_name', caster.display_name,
        'target_user_id', target_user_id_value, 'target_display_name', target_display_name_value,
        'display_name', caster.display_name, 'target_player', target_display_name_value,
        'spell_name', definition.display_name, 'spell_description', definition.description,
        'ability_id', ability_id_value
      )
    ) returning id into effect_id;
  end if;

  insert into ability_notifications (cast_id, effect_id, template_key, template, audience, recipient_user_id, recipient_camp, variables)
  select cast_id, effect_id, key, value,
    case when key like '%TARGET%' then 'user' when key like '%CAMP%' then 'camp'
      when key like '%ALL%' then 'all' else 'production' end,
    case when key like '%TARGET%' then target_user_id_value else null end,
    case when key like '%CAMP%' then caster.camp else null end,
    jsonb_build_object('display_name', caster.display_name, 'spell_name', definition.display_name,
      'spell_description', definition.description, 'target_player', target_display_name_value,
      'target_user_id', target_user_id_value, 'caster_user_id', auth.uid(),
      'caster_display_name', caster.display_name, 'target_display_name', target_display_name_value,
      'item', variables_value->>'item', 'location', variables_value->>'location',
      'npc', variables_value->>'npc', 'assigned_camp', variables_value->>'assigned_camp', 'camp', variables_value->>'camp')
  from jsonb_each_text(definition.notification_templates)
  where value is not null and value <> ''
    and key not in ('EFFECT_EXPIRED', 'READY_TO_ALL', 'COMMIT_SUCCESS');

  return jsonb_build_object('cast_id', cast_id, 'effect_id', effect_id, 'mana', remaining, 'status', cast_status);
end;
$$;

update public.ability_catalog
set notification_templates = jsonb_set(
  notification_templates,
  '{READY_TO_ALL}',
  to_jsonb('[assigned_camp] has cast Hivemind. You MUST gather in the center for a special event.'::text),
  true
)
where ability_id = 'ability_hivemind';

grant execute on function public.award_xp(integer, text) to authenticated;
grant execute on function public.award_mana(integer) to authenticated;
grant execute on function public.cast_ability(text, uuid, text, text, text, jsonb) to authenticated;
