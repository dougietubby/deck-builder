import { getSupabase } from './supabase.js';
import { initBottomNav } from './shared-nav.js';

const supabaseClientPromise = getSupabase();

document.addEventListener('DOMContentLoaded', async () => {
  const supabaseClient = await supabaseClientPromise;
  if (!supabaseClient) {
    alert('Supabase not configured');
    return;
  }

  // Check authentication
  const { data: session } = await supabaseClient.auth.getSession();
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
  document.getElementById('profileLevel').textContent = profile?.level || 1;
  document.getElementById('profileXP').textContent = profile?.xp || 0;
  document.getElementById('profileCamp').textContent = profile?.camp || 'Not assigned';
  
  // XP progress bar (assuming 100 XP per level for now)
  const xp = profile?.xp || 0;
  const xpForLevel = 100;
  const xpProgress = Math.min((xp % xpForLevel) / xpForLevel * 100, 100);
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
