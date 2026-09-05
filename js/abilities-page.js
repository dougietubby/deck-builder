import { initBottomNav } from './shared-nav.js';
import { ABILITIES } from './abilities.js';
import { getProgression } from './progression.js';
import { castAbility } from './ability-service.js';
import { getSupabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  initBottomNav();
  const status = document.getElementById('abilityStatus');
  const list = document.getElementById('abilityList');
  try {
    const progression = await getProgression();
    const client = await getSupabase();
    const { data: { session } } = await client.auth.getSession();
    const { data: unlockedRows } = await client.from('user_abilities').select('ability_id').eq('user_id', session.user.id);
    const unlockedAbilities = new Set((unlockedRows || []).map((row) => row.ability_id));
    status.innerHTML = `<span>LEVEL ${progression.level}</span><span class="mana-value">${progression.mana} MANA</span><span>${progression.xp} XP</span>`;
    list.innerHTML = ABILITIES.map((ability) => {
      const locked = Boolean(ability.unlockRequirement) && !unlockedAbilities.has(ability.id);
      const requirement = ability.unlockRequirement?.type === 'achievement' ? `Achievement: ${ability.unlockRequirement.id}` : `Level ${ability.unlockRequirement?.value}`;
      return `<article class="ability-card ${locked ? 'is-locked' : ''}"><div class="ability-rune">${ability.icon}</div><div class="ability-copy"><div class="ability-heading"><h2>${ability.name}</h2><span>${ability.manaCost} MANA</span></div><p>${ability.description}</p><small>${ability.uses}${ability.duration ? ` / ${ability.duration}` : ''}</small>${ability.restriction ? `<small class="text-warning">${ability.restriction}</small>` : ''}${locked ? `<div class="locked-label">LOCKED <span>${requirement}</span></div>` : `<button class="btn btn-primary cast-button" data-ability="${ability.id}" ${progression.mana < ability.manaCost ? 'disabled' : ''}>CAST</button>`}</div></article>`;
    }).join('');
    list.addEventListener('click', async (event) => {
      const button = event.target.closest('.cast-button');
      if (!button) return;
      button.disabled = true; button.textContent = 'CASTING...';
      try { await castAbility(button.dataset.ability); button.textContent = 'CAST'; } catch (error) { button.disabled = false; button.textContent = 'CAST'; alert(error.message || 'SPELL FAILED'); }
    });
  } catch (error) { status.textContent = error.message || 'Unable to load spellbook.'; }
});
