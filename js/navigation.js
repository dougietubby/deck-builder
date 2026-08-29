// Simple nav highlight + sign out
import { getSupabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', ()=>{
  const path = location.pathname;
  document.querySelectorAll('.nav-link').forEach(a=>{
    if (a.getAttribute('href') === path || a.getAttribute('href') === path.replace(/\/+$/, '') + '/') {
      a.classList.add('active');
    }
  });

  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) signOutBtn.addEventListener('click', async ()=>{
    const supabaseClient = getSupabase();
    await supabaseClient.auth.signOut();
    window.location.href = '/';
  });
});
