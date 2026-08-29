// Shared Supabase client
// supabase-config.js should set window.SUPABASE_URL and window.SUPABASE_ANON_KEY

async function ensureConfig() {
  // Wait for supabase-config to fetch public-config
  if (window.getSupabaseConfigPromise) {
    await window.getSupabaseConfigPromise;
  }

  const SUPABASE_URL = window.SUPABASE_URL || '';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase config is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify env or supabase-config.js for local testing.');
    return null;
  }

  window.supabaseClient = window.supabaseClient || (window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null);
  return window.supabaseClient;
}

export async function getSupabase() {
  return window.supabaseClient || await ensureConfig();
}

export default getSupabase;
