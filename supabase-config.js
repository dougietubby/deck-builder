// Supabase client configuration
// Replace the placeholders with your Supabase project URL and anon key.
// For production, prefer injecting these via environment variables during build.

// Default to the project's Supabase URL if present; override via Netlify env at build time.
window.SUPABASE_URL = window.SUPABASE_URL || "https://vtgdwihretrnmjnalfxd.supabase.co";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "public-anon-key-placeholder";

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
