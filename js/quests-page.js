import { initBottomNav } from './shared-nav.js';
import { QUESTS } from './quests.js';
import { ACHIEVEMENTS } from './achievements.js';
import { completeQuest } from './quest-service.js';
import { getSupabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  initBottomNav();
  const questList = document.getElementById('questList');
  const achievementList = document.getElementById('achievementList');
  let completedQuests = new Set(); let completedAchievements = new Set();
  try {
    const client = await getSupabase(); const { data: { session } } = await client.auth.getSession();
    if (session?.user) {
      const quests = await client.from('user_quests').select('quest_id').eq('user_id', session.user.id);
      const achievements = await client.from('user_achievements').select('achievement_id').eq('user_id', session.user.id);
      completedQuests = new Set((quests.data || []).map((row) => row.quest_id)); completedAchievements = new Set((achievements.data || []).map((row) => row.achievement_id));
    }
  } catch (error) { console.error(error); }
  questList.innerHTML = QUESTS.map((quest) => `<article class="journal-card"><div><p class="card-kicker">QUEST</p><h2>${quest.name}</h2><p>${quest.description}</p><div class="reward-line">${quest.xpReward ? `XP +${quest.xpReward}` : ''} ${quest.manaReward ? `MANA +${quest.manaReward}` : ''}</div></div><button class="btn ${completedQuests.has(quest.id) ? 'btn-muted' : 'btn-primary'} quest-button" data-quest="${quest.id}" ${completedQuests.has(quest.id) ? 'disabled' : ''}>${completedQuests.has(quest.id) ? 'COMPLETED' : 'COMPLETE'}</button></article>`).join('');
  achievementList.innerHTML = ACHIEVEMENTS.map((achievement) => `<article class="journal-card ${completedAchievements.has(achievement.id) ? 'is-complete' : ''}"><div><p class="card-kicker">ACHIEVEMENT</p><h2>${achievement.name}</h2><p>${achievement.description}</p><div class="reward-line">${achievement.reward ? `REWARD: ${achievement.reward.type}` : 'COLLECTIBLE'}</div></div><span class="status-label">${completedAchievements.has(achievement.id) ? 'COMPLETE' : 'LOCKED'}</span></article>`).join('');
  questList.addEventListener('click', async (event) => { const button = event.target.closest('.quest-button'); if (!button) return; button.disabled = true; try { await completeQuest(button.dataset.quest); button.textContent = 'COMPLETED'; } catch (error) { button.disabled = false; alert(error.message || 'QUEST FAILED'); } });
  document.querySelectorAll('.journal-tab').forEach((tab) => tab.addEventListener('click', () => { document.querySelectorAll('.journal-tab').forEach((item) => item.classList.toggle('active', item === tab)); questList.hidden = tab.dataset.tab !== 'quests'; achievementList.hidden = tab.dataset.tab !== 'achievements'; }));
});
