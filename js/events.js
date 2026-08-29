import { getSupabase } from './supabase.js';

const supabase = getSupabase();

document.addEventListener('DOMContentLoaded', async ()=>{
  const { data: session } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) { window.location.href = '/'; return; }

  const container = document.getElementById('eventsList');
  if (!container) return;

  try {
    const { data } = await supabase.from('events').select('*').order('start_at', { ascending: true });
    if (!data || data.length===0) { container.innerText = 'No upcoming events.'; return; }
    container.innerHTML = data.map(ev=>`<div class="event-item"><h3>${ev.title}</h3><div>${new Date(ev.start_at).toLocaleString()}</div><p>${ev.description||''}</p></div>`).join('');
  } catch(e) { container.innerText = 'Unable to load events.'; }
});
