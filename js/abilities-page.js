import { initBottomNav } from './shared-nav.js';
import { getProgression } from './progression.js';
import { castAbility, getAbilityDefinitions, getAbilityInputOptions } from './ability-service.js';
import { getSupabase } from './supabase.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));

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
    const abilities = await getAbilityDefinitions();
    status.innerHTML = `<span>LEVEL ${progression.level}</span><span class="mana-value">${progression.mana} MANA</span><span>${progression.xp} XP</span>`;
    list.innerHTML = abilities.map((ability) => {
      const locked = Boolean(ability.unlockRequirement) && !unlockedAbilities.has(ability.id);
      const requirement = ability.unlockRequirement?.type === 'achievement' ? `Achievement: ${ability.unlockRequirement.id}` : `Level ${ability.unlockRequirement?.value}`;
      return `<article class="ability-card ${locked ? 'is-locked' : ''}"><div class="ability-rune"><img src="${escapeHtml(ability.icon)}" alt="${escapeHtml(ability.name)} icon"></div><div class="ability-copy"><div class="ability-heading"><h2>${escapeHtml(ability.name)}</h2><span>${ability.manaCost} MANA</span></div><p>${escapeHtml(ability.description)}</p><small>${escapeHtml(ability.uses || 'Configurable')}</small>${locked ? `<div class="locked-label">LOCKED <span>${escapeHtml(requirement)}</span></div>` : `<button class="btn btn-primary cast-button" data-ability="${escapeHtml(ability.id)}" ${progression.mana < ability.manaCost ? 'disabled' : ''}>CAST</button>`}</div></article>`;
    }).join('');
    list.addEventListener('click', async (event) => {
      const button = event.target.closest('.cast-button');
      if (!button) return;
      button.disabled = true; button.textContent = 'CASTING...';
      try {
        const ability = abilities.find((item) => item.id === button.dataset.ability);
        const inputs = await collectInputs(ability, client, session.user.id, progression.level);
        if (!inputs) return;
        const target = { userId: inputs.target_player, camp: inputs.assigned_camp, npc: inputs.npc, location: inputs.location };
        await castAbility(ability.id, target, inputs);
        button.textContent = 'CAST';
        status.querySelector('.mana-value').textContent = `${(await getProgression()).mana} MANA`;
      } catch (error) { alert(error.message || 'SPELL FAILED'); }
      finally { button.disabled = false; button.textContent = 'CAST'; }
    });
  } catch (error) { status.textContent = error.message || 'Unable to load spellbook.'; }
});

async function collectInputs(ability, client, currentUserId, currentLevel) {
  const schema = ability.input_schema || [];
  if (!schema.length) return window.confirm(`Cast ${ability.name}? This will spend ${ability.manaCost} mana.`) ? {} : null;
  const form = document.createElement('form');
  form.className = 'modal-box';
  form.innerHTML = `<h2>${escapeHtml(ability.name)}</h2>${schema.map((input) => `<label>${escapeHtml(input.label || input.key)}<select name="${escapeHtml(input.key)}" ${input.required ? 'required' : ''}><option value="">Loading options...</option></select></label>`).join('')}<button class="btn btn-primary" type="submit" disabled>CONFIRM CAST</button><button class="btn" type="button" data-cancel>CANCEL</button>`;

  const wrapper = document.createElement('div');
  wrapper.className = 'modal-screen';
  wrapper.appendChild(form);
  document.body.appendChild(wrapper);

  for (const input of schema) {
    const select = form.elements.namedItem(input.key);
    if (!select) continue;
    const options = await getAbilityInputOptions(client, input, { currentUserId, currentLevel });
    select.replaceChildren(new Option(options.length ? `Select ${input.label || input.type}` : `No ${input.type} options configured`, ''));
    options.forEach((option) => select.add(new Option(option.label, option.value)));
    select.disabled = options.length === 0;
  }

  const submit = form.querySelector('button[type="submit"]');
  const updateSubmitState = () => {
    submit.disabled = schema.some((input) => input.required && !form.elements.namedItem(input.key)?.value);
  };
  form.addEventListener('change', updateSubmitState);
  updateSubmitState();

  return new Promise((resolve) => {
    const close = (value) => { wrapper.remove(); resolve(value); };
    form.addEventListener('submit', (event) => { event.preventDefault(); close(Object.fromEntries(new FormData(form).entries())); });
    form.querySelector('[data-cancel]').addEventListener('click', () => close(null));
  });
}
