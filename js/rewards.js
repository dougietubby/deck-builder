// ============================================================
// EASY CUSTOMIZATION AREA
// Reward behavior and future reward types belong here.
// ============================================================
export function applyReward(reward, unlocked = {}) {
  if (!reward) return unlocked;
  return { ...unlocked, [`${reward.type}:${reward.id || reward.amount}`]: true };
}
