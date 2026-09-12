-- Additive fix for the existing profile authority trigger.
-- Apply after fix_ability_mana_deduction.sql.
-- Only cast_ability() sets app.grove_ability_cast locally before its mana update.

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
      -- The cast RPC may change mana; all other authority fields remain protected.
      if current_setting('app.grove_ability_cast', true) is distinct from 'true' then
        new.mana := old.mana;
      end if;
      new.xp := old.xp;
      new.level := old.level;
      new.camp := old.camp;
      new.is_production := old.is_production;
    end if;
  end if;
  return new;
end;
$$;
