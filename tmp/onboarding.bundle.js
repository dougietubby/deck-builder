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

// js/onboarding.js
var verifyBtn = document.getElementById("verifyBtn");
var codeInput = document.getElementById("codeInput");
var verifyResult = document.getElementById("verifyResult");
var welcomeScreen = document.getElementById("welcomeScreen");
var verificationScreen = document.getElementById("verificationScreen");
var installBtn = document.getElementById("installBtn");
var continueBtn = document.getElementById("continueBtn");
var sendMagicLink = document.getElementById("sendMagicLink");
var emailInput = document.getElementById("emailInput");
var authResult = document.getElementById("authResult");
var deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
if (installBtn) installBtn.addEventListener("click", async () => {
  if (deferredPrompt) {
    await deferredPrompt.prompt();
  } else {
    document.getElementById("iosHint").style.display = "block";
  }
});
verifyBtn?.addEventListener("click", async () => {
  const code = codeInput.value.trim();
  try {
    const res = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const j = await res.json();
    if (j.valid) {
      localStorage.setItem("grove_verified", "true");
      localStorage.setItem("grove_camp", j.camp);
      verificationScreen.style.display = "none";
      welcomeScreen.style.display = "flex";
    } else {
      verifyResult.innerText = "Invalid code";
    }
  } catch (e) {
    verifyResult.innerText = "Verification failed";
  }
});
var supabaseClientPromise = getSupabase();
var getAuthCallbackUrl = () => new URL("/auth/callback", window.location.origin).toString();
(async () => {
  try {
    const supabaseClient = await supabaseClientPromise;
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.auth.getSessionFromUrl({ storeSession: true });
    if (error) {
      console.log("getSessionFromUrl:", error.message || error);
    }
    const user = data?.session?.user || (await supabaseClient.auth.getSession()).data.session?.user;
    if (user) {
      const profile = await ensureProfile(user);
      try {
        await syncOneSignalUser(user, profile);
      } catch (e) {
        console.warn("OneSignal sync skipped on landing redirect", e);
      }
      localStorage.setItem("grove_onboarded", "true");
      window.location.replace("/home/");
    }
  } catch (e) {
    console.error("Error handling magic link redirect", e);
  }
})();
sendMagicLink?.addEventListener("click", async () => {
  const email = (emailInput.value || "").trim();
  if (!email) {
    authResult.innerText = "Enter an email";
    return;
  }
  try {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      authResult.innerText = "Supabase not configured. Ask admin to set SUPABASE_URL and SUPABASE_ANON_KEY.";
      console.error("Supabase config missing", { SUPABASE_URL: window.SUPABASE_URL, SUPABASE_ANON_KEY: !!window.SUPABASE_ANON_KEY });
      return;
    }
    const supabaseClient = await supabaseClientPromise;
    if (!supabaseClient) {
      authResult.innerText = "Supabase client not available";
      return;
    }
    const callbackUrl = getAuthCallbackUrl();
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl }
    });
    if (error) {
      authResult.innerText = error.message || "Authentication error";
      console.error("signInWithOtp error", error);
      return;
    }
    authResult.innerHTML = "CHECK YOUR EMAIL<br><small>We sent a magic link to <strong>" + email + "</strong>. Tap the link in your email to finish signing in.</small>";
  } catch (e) {
    authResult.innerText = "Auth error";
  }
});
continueBtn?.addEventListener("click", async () => {
  const supabaseClient = await supabaseClientPromise;
  if (!supabaseClient) {
    alert("Supabase client not available.");
    return;
  }
  const session = await supabaseClient.auth.getSession();
  const user = session?.data?.session?.user;
  if (!user) {
    alert("Please sign in first.");
    return;
  }
  const profile = await ensureProfile(user);
  await syncOneSignalUser(user, profile);
  localStorage.setItem("grove_onboarded", "true");
  window.location.href = "/home/";
});
(async () => {
  const supabaseClient = await supabaseClientPromise;
  if (!supabaseClient) return;
  const session = await supabaseClient.auth.getSession();
  const onboarded = localStorage.getItem("grove_onboarded") === "true";
  if (session?.data?.session?.user && onboarded) {
    window.location.href = "/home/";
  }
})();
