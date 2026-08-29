// Supabase client configuration
// Replace the placeholders with your Supabase project URL and anon key.
// For production, prefer injecting these via environment variables during build.

// Leave blank by default to avoid pointing at an invalid project.
// Set these via Netlify environment variables or replace the values here for local testing.
window.SUPABASE_URL = window.SUPABASE_URL || "";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";

// Fetch public config from Netlify function at runtime (works in dev and production)
window.getSupabaseConfigPromise = window.getSupabaseConfigPromise || fetch('/.netlify/functions/public-config').then(r=>r.json()).then(cfg=>{
  if (cfg?.SUPABASE_URL) window.SUPABASE_URL = cfg.SUPABASE_URL;
  if (cfg?.SUPABASE_ANON_KEY) window.SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY;
  return cfg;
}).catch(err=>{
  console.warn('Could not load public-config', err);
  return {};
});

// Expose helper getter (actual client created in js/supabase.js after config promise resolves)
window.getSupabase = function() {
  return window._supabaseClient;
};
