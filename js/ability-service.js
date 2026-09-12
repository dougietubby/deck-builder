import { getSupabase } from './supabase.js';
import { getAbility } from './abilities.js';

export async function getAbilityDefinitions() {
  const client = await getSupabase();
  if (!client) return [];
  const { data, error } = await client.from('ability_catalog').select('*').eq('enabled', true).order('display_name');
  if (error || !data?.length || !data[0].display_name) return (await import('./abilities.js')).ABILITIES;
  return data.map((row) => {
    const usageLimitEnabled = row.usage_limit_enabled ?? (row.usage_limit !== null || row.usage_limit_count !== null);
    const usageLimitCount = row.usage_limit_count ?? row.usage_limit ?? null;
    const usageLimitType = row.usage_limit_type ?? row.usage_scope ?? 'user';
    return {
      ...row,
      id: row.ability_id,
      name: row.display_name,
      manaCost: row.mana_cost,
      usageLimitEnabled,
      usageLimitType,
      usageLimitCount,
      uses: !usageLimitEnabled || usageLimitCount === null ? 'Unlimited' : `${usageLimitCount} use${usageLimitCount === 1 ? '' : 's'}${usageLimitType === 'camp' ? ' per camp' : ''}`,
      input_schema: row.input_schema || [],
      unlockRequirement: row.eligibility?.achievement ? { type: 'achievement', id: row.eligibility.achievement } : undefined
    };
  });
}

export async function canAffordAbility(abilityId) {
  const ability = getAbility(abilityId);
  if (!ability) return false;
  const client = await getSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return false;
  const { data } = await client.from('profiles').select('mana').eq('id', session.user.id).maybeSingle();
  return (data?.mana || 0) >= ability.manaCost;
}

export async function commitAbility(castId) {
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured.');
  const { data, error } = await client.rpc('commit_ability', { cast_id_value: castId });
  if (error) throw error;
  return data;
}

export async function castAbility(abilityId, target = {}, variables = {}) {
  if (!abilityId) throw new Error('Unknown ability.');
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured.');
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in.');
  const { data: unlocked } = await client.from('user_abilities').select('ability_id').eq('user_id', session.user.id).eq('ability_id', abilityId).maybeSingle();
  const { data, error } = await client.rpc('cast_ability', { ability_id_value: abilityId, target_user_id_value: target.userId || null, target_camp_value: target.camp || null, target_npc_value: target.npc || null, target_location_value: target.location || null, variables_value: variables });
  if (error) throw error;
  return { ...data, ability: getAbility(abilityId) || { id: abilityId } };
}
