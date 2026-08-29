import { getSupabase } from './supabase.js';

const supabase = getSupabase();

document.addEventListener('DOMContentLoaded', async ()=>{
  const { data: session } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) { window.location.href = '/'; return; }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  document.getElementById('greeting').innerText = `Welcome, ${profile?.display_name || user.email || 'Grove Member'}`;
  document.getElementById('profileStats').innerText = `Grove Level: ${profile?.level || 1}`;
});
