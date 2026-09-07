// js/supabase.js
async function ensureConfig() {
  if (window.getSupabaseConfigPromise) {
    await window.getSupabaseConfigPromise;
  }
  const SUPABASE_URL = window.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "";
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase config is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify env or supabase-config.js for local testing.");
    return null;
  }
  window.supabaseClient = window.supabaseClient || (window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null);
  return window.supabaseClient;
}
async function getSupabase() {
  return window.supabaseClient || await ensureConfig();
}

// js/onesignal.js
async function logoutOneSignal() {
  if (!window.OneSignal) return;
  try {
    if (window.OneSignal && typeof window.OneSignal.logout === "function") {
      await window.OneSignal.logout();
    }
  } catch (e) {
    console.error("logoutOneSignal error", e);
  }
}

// js/auth.js
async function ensureProfile(user) {
  if (!user) return null;
  const supabaseClient = await getSupabase();
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) {
    console.error("ensureProfile error", error);
  }
  if (!data) {
    const { data: insertedData, error: insertError } = await supabaseClient.from("profiles").insert([{ id: user.id, display_name: user.email ? user.email.split("@")[0] : "Grove" }]).select().maybeSingle();
    if (insertError) {
      console.error("profile insert error", insertError);
    }
    return insertedData || null;
  }
  return data;
}
async function getProfile() {
  const supabaseClient = await getSupabase();
  if (!supabaseClient) return null;
  const { data: { session } } = await supabaseClient.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data } = await supabaseClient.from("profiles").select("*").eq("id", uid).maybeSingle();
  return data;
}
async function signOut() {
  const supabaseClient = await getSupabase();
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  try {
    await logoutOneSignal();
  } catch (e) {
  }
  window.location.href = "/";
}
export {
  ensureProfile,
  getProfile,
  signOut
};
