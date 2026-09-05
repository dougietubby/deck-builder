// ============================================================
// EASY CUSTOMIZATION AREA
// Add seasonal quests and edit XP/mana rewards here.
// ============================================================
export const QUESTS = [
  ['attended_s1', 'Attended Season 1', 1000, 0], ['won_s1', 'Won Season 1', 3550, 0], ['bonus_star_s1', 'Bonus Star', 0, 0],
  ['attended_s2', 'Attended Season 2', 1000, 0], ['no_place_like_home_s1', 'No Place Like Home', 25, 25], ['pbj_slay_s1', 'PBJ-Slay', 25, 25], ['chicken_run_s1', 'Chicken Run', 25, 25], ['drunk_asshole_s1', 'Drunk Asshole', 0, 25], ['mvp_s1', 'MVP', 0, 25], ['havoc_rakers_s1', 'Havoc Rakers', 0, 25], ['won_s2', 'Won Season 2', 3550, 0], ['beautify_grove_s2', 'Beautify the Grove', 0, 25], ['perfect_host_s2', 'Perfect Host', 0, 50],
  ['attended_s3', 'Attended Season 3', 1000, 0], ['no_place_like_home_s3', 'No Place Like Home', 25, 25], ['family_feast_s3', 'Family Feast', 25, 25], ['fudge_run_s3', 'Fudge Run', 25, 25], ['smelling_bee_s3', 'Smelling Bee', 25, 25], ['drunk_asshole_s3', 'Drunk Asshole', 0, 25], ['mvp_s3', 'MVP', 0, 25], ['helpful_harry_s3', 'Helpful Harry', 0, 25], ['speed_run_winner_s3', 'Speed Run Winner', 0, 25], ['community_cleanup_s3', 'Community Clean up', 0, 25], ['won_s3', 'Won Season 3', 3550, 0], ['attended_grave', 'Attended Grave', 0, 25], ['attended_rave', 'Attended Rave', 0, 25]
].map(([id, name, xp, mana]) => ({ id, name, description: 'Complete this Grove challenge.', xpReward: xp, manaReward: mana }));
export function getQuest(id) { return QUESTS.find((quest) => quest.id === id); }
