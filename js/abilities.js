const ICON_ROOT = '/assets/abilities/';

// Local defaults keep the spellbook usable until ability_catalog is seeded.
export const ABILITIES = [
  ability('ability_telegrab', 'Telegrab', 'Tell Production to retrieve an item from another camp.', 25, '1 use', 'telegrab_icon.png', [{ key: 'target_player', label: 'Target player', type: 'player', required: true, exclude_self: true }, { key: 'item', label: 'Item', type: 'item', required: true }], 'commit'),
  ability('ability_hivemind', 'Hivemind', 'Plan an event that everyone has to do in the center.', 35, '1 use per camp', 'hive_mind_icon.png', [], 'ready', { usageLimit: 1, usageScope: 'camp', unlockRequirement: { type: 'achievement', id: 'veteran_camper' } }),
  ability('ability_compulsion', 'Compulsion', 'Let everyone know that you are the highest-level Grove member.', 25, '1 use', 'compulsion_icon.png', [], 'instant', { eligibility: { type: 'highest_level' } }),
  ability('ability_spree', 'Spree', 'Everything they purchase is 1 can for the next minute.', 125, '1 use per camp', 'spree_icon.png', [], 'instant', { usageLimit: 1, usageScope: 'camp', durationSeconds: 60 }),
  ability('ability_conjure', 'Conjure', 'Summon an NPC to follow and assist the caster for 15 minutes.', 50, '1 use', 'conjure_icon.png', [{ key: 'npc', label: 'NPC', type: 'npc', required: true }], 'instant', { durationSeconds: 900 }),
  ability('ability_low_alch', 'Low Alch', 'Return a card for 1 can.', 5, 'Unlimited', 'low_alch_icon.png'),
  ability('ability_high_alch', 'High Alch', 'Return a card for its original value.', 35, '3 uses', 'high_alch_icon.png', [{ key: 'item', label: 'Card', type: 'item', required: true }], 'instant', { usageLimit: 3, unlockRequirement: { type: 'achievement', id: 'shopaholic' } }),
  ability('ability_superheat', 'Superheat', 'Exchange one item for another result.', 10, '1 use', 'superheat_icon.png', [{ key: 'item_1', label: 'Item to exchange', type: 'item', required: true }, { key: 'item_2', label: 'Item to receive', type: 'item', required: true }]),
  ability('ability_teleother', 'Teleother', 'Move another camper to a chosen location.', 25, '1 use per camp', 'teleother_icon.png', [{ key: 'target_player', label: 'Target player', type: 'player', required: true, exclude_self: true }, { key: 'location', label: 'Desired location', type: 'location', required: true }], 'instant', { usageLimit: 1, usageScope: 'camp' }),
  ability('ability_vengeance', 'Vengeance', 'The next spell that targets the caster is reflected back.', 25, '1 use', 'vengeance_icon.png', [], 'instant', { durationSeconds: 3600, target: 'caster', triggerType: 'targeted_ability', unlockRequirement: { type: 'achievement', id: 'high_score' } }),
  ability('ability_ice_barrage', 'Ice Barrage', 'Freeze a player for five minutes.', 25, '1 use', 'ice_barrage_icon.png', [{ key: 'target_player', label: 'Target player', type: 'player', required: true, exclude_self: true }], 'instant', { durationSeconds: 300 }),
  ability('ability_drop_party', 'Drop Party', 'Gather the NPCs and value items for a drop party in the center.', 50, '1 use per camp', 'drop_party_icon.png', [], 'ready', { usageLimit: 1, usageScope: 'camp' }),
  ability('ability_love_blast', 'Love Blast', 'Make your target serenade the caster.', 25, '1 use', 'love_potion_icon.png', [{ key: 'target_player', label: 'Target player', type: 'player', required: true, exclude_self: true }]),
  ability('ability_necromancy', 'Necromancy', 'Make your target walk like a zombie through each camp.', 25, '1 use', 'necromancy_icon.png', [{ key: 'target_player', label: 'Target player', type: 'player', required: true, exclude_self: true }])
];

function ability(id, name, description, manaCost, uses, icon, inputs = [], workflow = 'instant', options = {}) {
  const usageLimitEnabled = options.usageLimitEnabled ?? (options.usageLimit != null || options.usageLimitCount != null);
  const usageLimitCount = options.usageLimitCount ?? options.usageLimit ?? null;
  const usageLimitType = options.usageLimitType ?? options.usageScope ?? 'user';
  return {
    id, ability_id: id, name, display_name: name, description,
    manaCost, mana_cost: manaCost, uses, icon: ICON_ROOT + icon,
    usage_limit: usageLimitCount, usage_limit_enabled: usageLimitEnabled, usage_limit_type: usageLimitType,
    usage_limit_count: usageLimitCount, usage_scope: usageLimitType,
    input_schema: inputs, workflow, min_level: options.minLevel ?? 0,
    unlockRequirement: options.unlockRequirement,
    eligibility: options.eligibility ?? {},
    effect_config: { duration_seconds: options.durationSeconds ?? null, target: options.target, trigger_type: options.triggerType }
  };
}

export function getAbility(abilityId) {
  return ABILITIES.find((ability) => ability.id === abilityId);
}
