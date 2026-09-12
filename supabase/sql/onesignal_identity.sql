-- Additive OneSignal identity and Production-audience migration.
-- Apply after abilities_engine.sql.

alter table public.profiles
  add column if not exists is_production boolean not null default false;

create or replace function public.protect_profile_authority_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.role() <> 'service_role'
    and coalesce(auth.jwt()->'app_metadata'->>'role', '') not in ('admin', 'production') then
    if tg_op = 'INSERT' then
      new.mana := coalesce(new.mana, 100);
      new.xp := coalesce(new.xp, 0);
      new.level := coalesce(new.level, 1);
      new.camp := null;
      new.is_production := false;
    else
      new.mana := old.mana;
      new.xp := old.xp;
      new.level := old.level;
      new.camp := old.camp;
      new.is_production := old.is_production;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_progression_fields on public.profiles;
drop trigger if exists protect_profile_authority_fields on public.profiles;
create trigger protect_profile_authority_fields
before insert or update on public.profiles
for each row execute procedure public.protect_profile_authority_fields();
