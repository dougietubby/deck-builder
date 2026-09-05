import { getSupabase } from './supabase.js';
import { getLevelFromXP, getXPIntoCurrentLevel, getXPRequiredForNextLevel } from './progression-config.js';
import { showLevelUpAnimation, showRewardSequence } from './animation-rewards.js';

export { getLevelFromXP, getXPIntoCurrentLevel, getXPRequiredForNextLevel };

async function currentUser() {
  const client = await getSupabase();
  if (!client) throw new Error('Supabase is not configured.');
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in.');
  return { client, user: session.user };
}

export async function getProgression() {
  const { client, user } = await currentUser();
  const { data, error } = await client.from('profiles').select('id,display_name,level,xp,mana,equipped_avatar').eq('id', user.id).maybeSingle();
  if (error) throw error;
  const xp = data?.xp || 0;
  return { ...(data || {}), xp, mana: data?.mana || 0, level: getLevelFromXP(xp), xpIntoLevel: getXPIntoCurrentLevel(xp), xpPerLevel: getXPRequiredForNextLevel() };
}

export async function addXP(amount, reason = 'Grove reward') {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('XP amount must be positive.');
  const { client, user } = await currentUser();
  const before = await getProgression();
  const { data, error } = await client.rpc('award_xp', { amount_value: Math.floor(amount), reason_value: reason });
  if (error) throw error;
  const after = { ...before, ...(data || {}), xp: data?.xp ?? before.xp + amount };
  after.level = getLevelFromXP(after.xp);
  showRewardSequence({ title: reason, xp: amount });
  if (after.level > before.level) showLevelUpAnimation(before.level, after.level, [`+${after.level - before.level} LEVEL`]);
  return after;
}

export async function getMana() { return (await getProgression()).mana; }
export async function addMana(amount) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Mana amount must be positive.');
  const { client } = await currentUser();
  const { data, error } = await client.rpc('award_mana', { amount_value: Math.floor(amount) });
  if (error) throw error;
  return data;
}
export async function spendMana(amount) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Mana amount must be positive.');
  const { client } = await currentUser();
  const { data, error } = await client.rpc('spend_mana', { amount_value: Math.floor(amount) });
  if (error) throw error;
  return data;
}
