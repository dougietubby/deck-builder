// ============================================================
// EASY CUSTOMIZATION AREA
// Change progression thresholds and starting values here.
// ============================================================
export const PROGRESSION_CONFIG = {
  xpPerLevel: 100,
  startingLevel: 0,
  startingXP: 0,
  startingMana: 100
};

export function getLevelFromXP(xp = 0) {
  return Math.max(PROGRESSION_CONFIG.startingLevel, Math.floor(Math.max(0, xp) / PROGRESSION_CONFIG.xpPerLevel));
}

export function getXPIntoCurrentLevel(xp = 0) {
  return Math.max(0, xp) % PROGRESSION_CONFIG.xpPerLevel;
}

export function getXPRequiredForNextLevel() {
  return PROGRESSION_CONFIG.xpPerLevel;
}
