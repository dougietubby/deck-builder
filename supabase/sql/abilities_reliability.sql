-- Additive reliability migration. Apply after abilities_engine.sql.
-- This does not provide mathematical exactly-once delivery across Supabase and OneSignal.

alter table public.ability_notifications
  add column if not exists idempotency_key text,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_attempts integer not null default 0,
  add column if not exists last_error text,
  add column if not exists failed_at timestamptz;

update public.ability_notifications
set idempotency_key = md5(concat_ws(':', cast_id, effect_id, template_key, audience,
  coalesce(recipient_user_id::text, ''), coalesce(recipient_camp, '')))
where idempotency_key is null;

delete from public.ability_notifications older
using public.ability_notifications newer
where older.idempotency_key = newer.idempotency_key
  and older.id < newer.id;

alter table public.ability_notifications
  alter column idempotency_key set not null;

create unique index if not exists ability_notifications_idempotency_key_idx
  on public.ability_notifications (idempotency_key);

create index if not exists ability_notifications_processing_idx
  on public.ability_notifications (status, processing_started_at);

create or replace function public.set_ability_notification_idempotency_key()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.idempotency_key is null or new.idempotency_key = '' then
    new.idempotency_key := md5(concat_ws(':', new.cast_id, new.effect_id, new.template_key,
      new.audience, coalesce(new.recipient_user_id::text, ''), coalesce(new.recipient_camp, '')));
  end if;
  return new;
end;
$$;

drop trigger if exists set_ability_notification_idempotency_key on public.ability_notifications;
create trigger set_ability_notification_idempotency_key
before insert on public.ability_notifications
for each row execute procedure public.set_ability_notification_idempotency_key();

create or replace function public.reclaim_stale_ability_notifications(
  lease_seconds integer default 300,
  max_attempts integer default 5
) returns integer language plpgsql security definer set search_path = public as $$
declare reclaimed_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  with reclaimed as (
    update ability_notifications
    set status = case when processing_attempts >= max_attempts then 'failed' else 'pending' end,
        failed_at = case when processing_attempts >= max_attempts then now() else failed_at end,
        last_error = case when processing_attempts >= max_attempts
          then coalesce(last_error, 'Maximum delivery attempts exceeded')
          else coalesce(last_error, 'Recovered stale processing lease') end,
        processing_started_at = null
    where status = 'processing'
      and (processing_started_at is null or processing_started_at < now() - make_interval(secs => greatest(30, lease_seconds)))
    returning id
  ) select count(*) into reclaimed_count from reclaimed;
  return reclaimed_count;
end;
$$;

drop function if exists public.claim_ability_notifications(integer);

create or replace function public.claim_ability_notifications(
  limit_value integer default 50,
  lease_seconds integer default 300,
  max_attempts integer default 5
) returns setof ability_notifications
language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Service role required';
  end if;

  perform public.reclaim_stale_ability_notifications(lease_seconds, max_attempts);

  return query
  with claimed as (
    select id from ability_notifications
    where status = 'pending' and processing_attempts < max_attempts
    order by created_at
    for update skip locked
    limit greatest(1, least(limit_value, 100))
  )
  update ability_notifications n
  set status = 'processing',
      processing_started_at = now(),
      processing_attempts = n.processing_attempts + 1,
      last_error = null
  from claimed
  where n.id = claimed.id
  returning n.*;
end;
$$;

revoke all on function public.claim_ability_notifications(integer, integer, integer) from public;
grant execute on function public.claim_ability_notifications(integer, integer, integer) to service_role;
revoke all on function public.reclaim_stale_ability_notifications(integer, integer) from public;
grant execute on function public.reclaim_stale_ability_notifications(integer, integer) to service_role;

-- Prevent duplicate jobs if the cast function or a retry attempts to enqueue the same event.
-- The trigger computes the same stable key used by the unique index; duplicate inserts are ignored.
create or replace function public.ignore_duplicate_ability_notification()
returns trigger language plpgsql set search_path = public as $$
declare notification_key text;
begin
  notification_key := coalesce(nullif(new.idempotency_key, ''), md5(concat_ws(':', new.cast_id, new.effect_id, new.template_key,
    new.audience, coalesce(new.recipient_user_id::text, ''), coalesce(new.recipient_camp, ''))));
  new.idempotency_key := notification_key;
  if exists (select 1 from ability_notifications where idempotency_key = notification_key) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists ignore_duplicate_ability_notification on public.ability_notifications;
create trigger ignore_duplicate_ability_notification
before insert on public.ability_notifications
for each row execute procedure public.ignore_duplicate_ability_notification();
