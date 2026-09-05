import { getSupabase } from './supabase.js';
import { getAchievement } from './achievements.js';
import { addXP } from './progression.js';

export async function completeAchievement(achievementId) {
  const achievement = getAchievement(achievementId);
  if (!achievement) throw new Error('Unknown achievement.');
  const client = await getSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in.');
  const reward = achievement.reward;
  const { data, error } = await client.rpc('complete_achievement', {
    achievement_id_value: achievementId,
    reward_type_value: reward?.type || null,
    reward_id_value: reward?.id || (reward?.amount != null ? String(reward.amount) : null)
  });
  if (error) throw error;
  if (achievement.reward?.type === 'xp') await addXP(achievement.reward.amount, achievement.name);
  return data;
}
