export function showXPReward(amount, reason = '') {
  showRewardToast(`+${amount} XP`, reason, 'xp');
}

export function showManaReward(amount, reason = '') {
  showRewardToast(`+${amount} MANA`, reason, 'mana');
}

export function showRewardSequence({ title = 'REWARD', xp = 0, mana = 0 } = {}) {
  const details = [xp ? `+${xp} XP` : '', mana ? `+${mana} MANA` : ''].filter(Boolean).join('  ');
  showRewardToast(details || title, title, 'reward');
}

export function showLevelUpAnimation(oldLevel, newLevel, rewards = []) {
  const overlay = document.createElement('div');
  overlay.className = 'level-up-overlay';
  overlay.innerHTML = `<div class="level-up-panel"><div class="level-up-kicker">LEVEL UP!</div><strong>LEVEL ${newLevel}</strong><p>${rewards.join('  ')}</p><button class="btn btn-primary" type="button">CONTINUE</button></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('button').addEventListener('click', () => overlay.remove());
  setTimeout(() => overlay.remove(), 9000);
}

function showRewardToast(value, reason, kind) {
  const toast = document.createElement('div');
  toast.className = `reward-toast reward-toast-${kind}`;
  toast.innerHTML = `<strong>${value}</strong>${reason ? `<span>${reason}</span>` : ''}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}
