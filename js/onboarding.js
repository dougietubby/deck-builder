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

sendMagicLink?.addEventListener('click', async ()=>{
  const email = (emailInput.value || '').trim();
  if (!email) { authResult.innerText = 'Enter an email'; return; }
  try {
    const { error } = await supabaseClient.auth.signInWithOtp({ email });
    if (error) { authResult.innerText = error.message; return; }
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
