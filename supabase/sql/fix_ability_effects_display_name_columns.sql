-- Additive schema fix for the current ability engine.
-- This reconciles the repository SQL with the live database when the newer display-name columns are missing.

alter table public.ability_effects
  add column if not exists caster_display_name text;

alter table public.ability_effects
  add column if not exists target_display_name text;
