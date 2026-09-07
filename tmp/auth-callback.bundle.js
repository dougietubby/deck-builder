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
async function syncOneSignalUser(user, profile) {
  if (!window.OneSignal) return;
  try {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.login(user.id);
        await OneSignal.User.addTags({ grove_member: "true", camp: profile?.camp || localStorage.getItem("grove_camp") || "unknown" });
      } catch (e) {
        console.error("syncOneSignalUser error", e);
      }
    });
  } catch (e) {
    console.error("syncOneSignalUser outer error", e);
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

// js/auth-callback.js
var authStatus = document.getElementById("authStatus");
var errorBox = document.getElementById("errorBox");
var errorMessage = document.getElementById("errorMessage");
function setStatus(message) {
  authStatus.textContent = message;
}
function showError(message) {
  errorMessage.textContent = message;
  errorBox.classList.add("show");
  authStatus.textContent = "Preparing your camp...";
}
async function waitForSession(client, timeoutMs = 8e3) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
      console.warn("Session polling error", error);
    }
    if (session?.user) {
      return session;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}
async function handleCallback() {
  const client = await getSupabase();
  if (!client) {
    showError("Supabase is not configured yet. Please return to the login screen and try again.");
    return;
  }
  try {
    setStatus("Authenticating camper...");
    const { data, error } = await client.auth.getSessionFromUrl({ storeSession: true });
    if (error) {
      console.warn("Magic link callback error", error);
    }
    let session = data?.session || await waitForSession(client);
    if (!session?.user) {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hasTokenError = params.get("error") || hash.get("error") || params.get("error_code") || hash.get("error_code");
      if (hasTokenError) {
        showError("We couldn't sign you in. Your magic link may have expired. Please request a new one.");
        return;
      }
      showError("We couldn't sign you in. Please request a new magic link and try again.");
      return;
    }
    setStatus("Preparing your camp...");
    const user = session.user;
    const profile = await ensureProfile(user);
    if (!profile) {
      throw new Error("Profile unavailable after authentication");
    }
    try {
      await syncOneSignalUser(user, profile);
    } catch (syncError) {
      console.warn("OneSignal sync skipped after auth callback", syncError);
    }
    localStorage.setItem("grove_onboarded", "true");
    window.location.replace("/home/");
  } catch (error) {
    console.error("Auth callback failure", error);
    showError("We couldn't sign you in. Your magic link may have expired. Please request a new magic link.");
  }
}
handleCallback();
