import { getSupabase } from './supabase.js';
import { initBottomNav } from './shared-nav.js';
import { getProgression } from './progression.js';
import { PROFILE_ICONS } from './profile-icons.js';

const supabaseClientPromise = getSupabase();

document.addEventListener('DOMContentLoaded', async () => {
  const supabaseClient = await supabaseClientPromise;
  if (!supabaseClient) {
    alert('Supabase not configured');
    return;
  }

  // Check authentication
  const { data: { session } } = await supabaseClient.auth.getSession();
  const user = session?.user;
  if (!user) {
    window.location.href = '/';
    return;
  }

  // Initialize navigation
  initBottomNav();

  // Load profile data
  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error loading profile:', error);
  }

  // Display profile info
  document.getElementById('profileName').textContent = profile?.display_name || user.email?.split('@')[0] || 'Grove Member';
  document.getElementById('profileEmail').textContent = user.email;
  const progression = await getProgression();
  document.getElementById('profileLevel').textContent = progression.level;
  document.getElementById('profileXP').textContent = progression.xp;
  document.getElementById('profileMana').textContent = progression.mana;
  document.getElementById('profileCamp').textContent = profile?.camp || 'Not assigned';

  const avatarPicker = document.getElementById('avatarPicker');
  const avatarMessage = document.getElementById('avatarMessage');
  const { data: unlockedRows } = await supabaseClient.from('user_rewards').select('reward_id').eq('user_id', user.id).eq('reward_type', 'avatar');
  const unlockedAvatars = new Set(['default', ...(unlockedRows || []).map((row) => row.reward_id)]);
  avatarPicker.innerHTML = PROFILE_ICONS.map((avatar) => {
    const unlocked = avatar.unlocked || unlockedAvatars.has(avatar.id);
    const selected = (profile?.equipped_avatar || 'default') === avatar.id;
    return `<button type="button" class="avatar-option ${unlocked ? '' : 'is-locked'} ${selected ? 'is-equipped' : ''}" data-avatar="${avatar.id}" ${unlocked ? '' : 'disabled'}><span class="avatar-image" style="background-image:url('${avatar.image}')"></span><span>${unlocked ? avatar.name : 'LOCKED'}</span></button>`;
  }).join('');
  avatarPicker.addEventListener('click', async (event) => {
    const button = event.target.closest('.avatar-option');
    if (!button || button.disabled) return;
    button.disabled = true;
    const { error } = await supabaseClient.from('profiles').update({ equipped_avatar: button.dataset.avatar }).eq('id', user.id);
    button.disabled = false;
    if (error) { avatarMessage.textContent = 'Unable to equip profile art.'; return; }
    avatarPicker.querySelectorAll('.avatar-option').forEach((item) => item.classList.toggle('is-equipped', item === button));
    avatarMessage.textContent = 'Profile art equipped.';
  });
  
  // XP progress bar (assuming 100 XP per level for now)
  const xp = progression.xp;
  const xpForLevel = progression.xpPerLevel;
  const xpProgress = Math.min(progression.xpIntoLevel / xpForLevel * 100, 100);
  document.getElementById('profileXPBar').style.width = xpProgress + '%';
  document.getElementById('profileXPText').textContent = `${xp % xpForLevel} / ${xpForLevel} XP to next level`;

  // Populate form
  document.getElementById('displayNameInput').value = profile?.display_name || '';

  // Handle profile form submission
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const displayName = document.getElementById('displayNameInput').value.trim();
    if (!displayName) {
      document.getElementById('profileUpdateMessage').innerHTML = '<span class="text-danger">Please enter a display name</span>';
      return;
    }

    const { error } = await supabaseClient
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      document.getElementById('profileUpdateMessage').innerHTML = '<span class="text-danger">Failed to update profile</span>';
    } else {
      document.getElementById('profileUpdateMessage').innerHTML = '<span class="text-success">Profile updated!</span>';
      setTimeout(() => {
        document.getElementById('profileUpdateMessage').innerHTML = '';
      }, 2000);
    }
  });

  // Show session info
  document.getElementById('sessionInfo').textContent = `User ID: ${user.id}\nEmail: ${user.email}\nAuthenticated: Yes`;
});
