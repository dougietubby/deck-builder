import { getSupabase } from './supabase.js';
import { ensureProfile } from './auth.js';
import { syncOneSignalUser } from './onesignal.js';

// Elements
const verifyBtn = document.getElementById('verifyBtn');
const codeInput = document.getElementById('codeInput');
const verifyResult = document.getElementById('verifyResult');
const welcomeScreen = document.getElementById('welcomeScreen');
const verificationScreen = document.getElementById('verificationScreen');
const installBtn = document.getElementById('installBtn');
const continueBtn = document.getElementById('continueBtn');
const sendMagicLink = document.getElementById('sendMagicLink');
const emailInput = document.getElementById('emailInput');
const authResult = document.getElementById('authResult');

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt = e; });

if (installBtn) installBtn.addEventListener('click', async ()=>{ if (deferredPrompt) { await deferredPrompt.prompt(); } else { document.getElementById('iosHint').style.display = 'block'; } });

verifyBtn?.addEventListener('click', async ()=>{
  const code = codeInput.value.trim();
  try {
    const res = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ code }) });
    const j = await res.json();
    if (j.valid) {
      localStorage.setItem('grove_verified', 'true');
      localStorage.setItem('grove_camp', j.camp);
      verificationScreen.style.display = 'none';
      welcomeScreen.style.display = 'flex';
    } else {
      verifyResult.innerText = 'Invalid code';
    }
  } catch (e) {
    verifyResult.innerText = 'Verification failed';
  }
});

const supabaseClient = getSupabase();

// Handle redirect back from Supabase magic link: parse session from URL and store it
(async ()=>{
  try {
    if (!supabaseClient) return;
    const { data, error } = await supabaseClient.auth.getSessionFromUrl({ storeSession: true });
    if (error) {
      // Not necessarily an error — only log
      console.log('getSessionFromUrl:', error.message || error);
    }

    const user = data?.session?.user;
    if (user) {
      // ensure profile and link OneSignal, then redirect
      const profile = await ensureProfile(user);
      try { await syncOneSignalUser(user, profile); } catch(e){}
      localStorage.setItem('grove_onboarded','true');
      window.location.href = '/home/';
    }
  } catch (e) {
    console.error('Error handling magic link redirect', e);
  }
})();

sendMagicLink?.addEventListener('click', async ()=>{
  const email = (emailInput.value || '').trim();
  if (!email) { authResult.innerText = 'Enter an email'; return; }
  try {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
      authResult.innerText = 'Supabase not configured. Ask admin to set SUPABASE_URL and SUPABASE_ANON_KEY.';
      console.error('Supabase config missing', { SUPABASE_URL: window.SUPABASE_URL, SUPABASE_ANON_KEY: !!window.SUPABASE_ANON_KEY });
      return;
    }

    const { error } = await supabaseClient.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/home/' } });
    if (error) { authResult.innerText = error.message || 'Authentication error'; console.error('signInWithOtp error', error); return; }
    authResult.innerText = 'Magic link sent — check your email';
  } catch (e) { authResult.innerText = 'Auth error'; }
});

continueBtn?.addEventListener('click', async ()=>{
  const session = await supabaseClient.auth.getSession();
  const user = session?.data?.session?.user;
  if (!user) { alert('Please sign in first.'); return; }

  // ensure profile exists
  const profile = await ensureProfile(user);
  // associate OneSignal external id and tags
  await syncOneSignalUser(user, profile);

  localStorage.setItem('grove_onboarded','true');
  // redirect to home
  window.location.href = '/home/';
});

// Auto-redirect if already authenticated and onboarded
(async ()=>{
  const session = await supabaseClient.auth.getSession();
  const onboarded = localStorage.getItem('grove_onboarded') === 'true';
  if (session?.data?.session?.user && onboarded) {
    window.location.href = '/home/';
  }
})();
