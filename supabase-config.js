// Supabase client configuration
// Replace the placeholders with your Supabase project URL and anon key.
// For production, prefer injecting these via environment variables during build.

window.SUPABASE_URL = window.SUPABASE_URL || "https://your-project.supabase.co";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "public-anon-key";

if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
  window._supabaseClient = window._supabaseClient || window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
}

// Expose helper getter
window.getSupabase = function() {
  return window._supabaseClient;
};
