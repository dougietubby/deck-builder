import { getSupabase } from './supabase.js';
import { getQuest } from './quests.js';
import { addXP, addMana } from './progression.js';
import { showRewardSequence } from './animation-rewards.js';

export async function completeQuest(questId) {
  const quest = getQuest(questId);
  if (!quest) throw new Error('Unknown quest.');
  const client = await getSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user) throw new Error('You must be signed in.');
  const { data, error } = await client.rpc('complete_quest', { quest_id_value: questId });
  if (error) throw error;
  if (quest.xpReward) await addXP(quest.xpReward, quest.name);
  if (quest.manaReward) await addMana(quest.manaReward);
  showRewardSequence({ title: 'QUEST COMPLETE', xp: quest.xpReward, mana: quest.manaReward });
  return data;
}
