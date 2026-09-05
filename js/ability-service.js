import { getSupabase } from './supabase.js';
import { getAbility } from './abilities.js';
import { sendAbilityNotification } from './notifications.js';

export async function canAffordAbility(abilityId) {
  const ability = getAbility(abilityId);
  if (!ability) return false;
  const client = await getSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) return false;
  const { data } = await client.from('profiles').select('mana').eq('id', session.user.id).maybeSingle();
  return (data?.mana || 0) >= ability.manaCost;
}

export async function castAbility(abilityId, target = {}, variables = {}) {
  const ability = getAbility(abilityId);
  if (!ability) throw new Error('Unknown ability.');
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured.');
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in.');
  const { data: unlocked } = await client.from('user_abilities').select('ability_id').eq('user_id', session.user.id).eq('ability_id', abilityId).maybeSingle();
  if (ability.unlockRequirement && !unlocked) throw new Error('This ability is locked.');
  const { data, error } = await client.rpc('cast_ability', { ability_id_value: abilityId, target_user_id_value: target.userId || null, target_camp_value: target.camp || null, target_npc_value: target.npc || null, target_location_value: target.location || null, variables_value: variables });
  if (error) throw error;
  const { data: sender } = await client.from('profiles').select('display_name,camp').eq('id', session.user.id).maybeSingle();
  const notification = await sendAbilityNotification({ ability, sender, target, variables });
  return { ...data, notification };
}
