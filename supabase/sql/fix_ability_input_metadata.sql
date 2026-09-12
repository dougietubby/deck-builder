-- Additive input metadata correction. No content records or spell behavior are changed.

update public.ability_catalog
set input_schema = '[{"key":"target_player","label":"Target player","type":"player","required":true,"exclude_self":true},{"key":"item","label":"Item","type":"item","required":true}]'::jsonb
where ability_id = 'ability_telegrab';

update public.ability_catalog
set input_schema = '[{"key":"item_1","label":"Item to exchange","type":"item","required":true},{"key":"item_2","label":"Item to receive","type":"item","required":true}]'::jsonb
where ability_id = 'ability_superheat';

update public.ability_catalog
set input_schema = '[{"key":"target_player","label":"Target player","type":"player","required":true,"exclude_self":true},{"key":"location","label":"Desired location","type":"location","required":true}]'::jsonb
where ability_id = 'ability_teleother';

update public.ability_catalog
set input_schema = '[{"key":"target_player","label":"Target player","type":"player","required":true,"exclude_self":true}]'::jsonb
where ability_id in ('ability_ice_barrage', 'ability_love_blast', 'ability_necromancy');
