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
  const { data: { session } } = await supabaseClient.auth.getSession();
  const user = session?.user;
  if (!user) {
    window.location.href = '/';
    return;
  }

  // Initialize navigation
  initBottomNav();

  const container = document.getElementById('eventsList');
  if (!container) return;

  try {
    const { data } = await supabaseClient
      .from('events')
      .eq('is_public', true)
      .order('start_at', { ascending: true, nullsFirst: false });


      
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="card text-center"><p class="text-secondary">No events scheduled yet.</p></div>';
      return;
    }

    container.innerHTML = data
      .map(ev => `
        <div class="card mb-lg">
          <h3>${ev.title}</h3>
          <p class="text-secondary text-sm">${new Date(ev.start_at).toLocaleString()}</p>
          <p>${ev.description || ''}</p>
        </div>
      `)
      .join('');
  } catch (e) {
    console.error('Error loading events:', e);
    container.innerHTML = '<div class="card text-center text-danger">Unable to load events.</div>';
  }
});

