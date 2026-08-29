// Shared Supabase client
// supabase-config.js should set window.SUPABASE_URL and window.SUPABASE_ANON_KEY

const SUPABASE_URL = window.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase config is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in supabase-config.js or via env.');
}

window.supabaseClient = window.supabaseClient || (window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null);

export function getSupabase() {
  return window.supabaseClient;
}

export default function() { return getSupabase(); }
