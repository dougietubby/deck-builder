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

  // Initialize bottom navigation
  initBottomNav();

  // Load profile
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // Update greeting
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Grove Member';
  document.getElementById('greeting').textContent = `Welcome back, ${displayName}!`;

  // Update player card
  document.getElementById('playerName').textContent = displayName;
  document.getElementById('playerSubtitle').textContent = `ID: ${user.id.slice(0, 8)}...`;
  
  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  document.getElementById('playerLevelBadge').querySelector('.level-number').textContent = level;
  document.getElementById('playerXP').textContent = `${xp} XP`;
  document.getElementById('playerCamp').textContent = profile?.camp || 'Unassigned';
});

