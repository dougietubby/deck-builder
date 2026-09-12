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
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const confirmPasswordInput = document.getElementById('confirmPasswordInput');
const authHeading = document.getElementById('authHeading');
const authSubmit = document.getElementById('authSubmit');
const authModeToggle = document.getElementById('authModeToggle');
const forgotPassword = document.getElementById('forgotPassword');
const authResult = document.getElementById('authResult');

let deferredPrompt = null;
let isLoginMode = false;

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

const supabaseClientPromise = getSupabase();

function showAuthMessage(message, isError = true) {
  authResult.textContent = message;
  authResult.style.color = isError ? '#f66' : '#7FFF00';
}

function setLoginMode(loginMode) {
  isLoginMode = loginMode;
  authHeading.textContent = loginMode ? 'Welcome back' : 'Create your Grove account';
  authSubmit.textContent = loginMode ? 'Enter the Grove' : 'Create Account';
  authModeToggle.textContent = loginMode ? 'Create a new account' : 'I already have an account';
  confirmPasswordInput.style.display = loginMode ? 'none' : '';
  forgotPassword.style.display = loginMode ? '' : 'none';
  showAuthMessage('');
}

async function finishAuthentication(user) {
  const profile = await ensureProfile(user);
  if (!profile) throw new Error('Profile unavailable after authentication');
  try {
    await syncOneSignalUser(user, profile);
  } catch (error) {
    console.warn('[onboarding] OneSignal sync skipped after authentication', error);
  }
  try {
    const supabaseClient = await supabaseClientPromise;
    await supabaseClient.functions.invoke('sync-onesignal-user', { body: {} });
  } catch (error) {
    console.warn('[onboarding] server-side OneSignal sync deferred', error);
  }
  localStorage.setItem('grove_onboarded', 'true');
  window.location.replace('/home/');
}

function friendlyAuthError(error, action) {
  const message = (error?.message || '').toLowerCase();
  if (message.includes('invalid login credentials')) return 'That email or password is incorrect.';
  if (message.includes('already registered') || message.includes('user already registered')) return 'An account with that email already exists. Try signing in.';
  if (message.includes('email not confirmed')) return 'Please confirm your email address before signing in.';
  if (message.includes('password')) return 'Use a password with at least 6 characters.';
  if (message.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
  return action === 'signup' ? 'We could not create your account. Please try again.' : 'We could not sign you in. Please try again.';
}

authModeToggle?.addEventListener('click', () => setLoginMode(!isLoginMode));

authSubmit?.addEventListener('click', async () => {
  const email = (emailInput.value || '').trim().toLowerCase();
  const password = passwordInput.value || '';
  const confirmation = confirmPasswordInput.value || '';
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) { showAuthMessage('Enter a valid email address.'); return; }
  if (!password || password.length < 6) { showAuthMessage('Password must be at least 6 characters.'); return; }
  if (!isLoginMode && password !== confirmation) { showAuthMessage('Passwords do not match.'); return; }

  const supabaseClient = await supabaseClientPromise;
  if (!supabaseClient) { showAuthMessage('Authentication is temporarily unavailable.'); return; }
  authSubmit.disabled = true;
  showAuthMessage(isLoginMode ? 'Entering the Grove...' : 'Creating your account...', false);
  try {
    const result = isLoginMode
      ? await supabaseClient.auth.signInWithPassword({ email, password })
      : await supabaseClient.auth.signUp({ email, password });
    if (result.error) throw result.error;
    if (!result.data.session?.user) {
      setLoginMode(true);
      showAuthMessage('Account created. Check your email to confirm your address, then sign in.', false);
      return;
    }
    await finishAuthentication(result.data.session.user);
  } catch (error) {
    console.error('[onboarding] password authentication failed', error);
    showAuthMessage(friendlyAuthError(error, isLoginMode ? 'login' : 'signup'));
  } finally {
    authSubmit.disabled = false;
  }
});

forgotPassword?.addEventListener('click', async () => {
  const email = (emailInput.value || '').trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) { showAuthMessage('Enter your email address first.'); return; }
  const supabaseClient = await supabaseClientPromise;
  if (!supabaseClient) { showAuthMessage('Authentication is temporarily unavailable.'); return; }
  forgotPassword.disabled = true;
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: new URL('/', window.location.origin).toString() });
    if (error) throw error;
    showAuthMessage('Check your email for a password reset link.', false);
  } catch (error) {
    console.error('[onboarding] password reset failed', error);
    showAuthMessage('We could not start password recovery. Please try again.');
  } finally {
    forgotPassword.disabled = false;
  }
});

async function handleRecoverySession(supabaseClient) {
  if (new URLSearchParams(window.location.hash.slice(1)).get('type') !== 'recovery') return false;
  const newPassword = window.prompt('Enter a new password (at least 6 characters):');
  if (!newPassword || newPassword.length < 6) {
    showAuthMessage('Password reset was not completed. Use at least 6 characters.');
    return true;
  }
  const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
  history.replaceState({}, document.title, window.location.pathname);
  if (error) {
    showAuthMessage('This password reset link is expired or invalid. Request a new one.');
    return true;
  }
  await supabaseClient.auth.signOut();
  setLoginMode(true);
  showAuthMessage('Password updated. Sign in with your new password.', false);
  return true;
}

(async () => {
  try {
    const supabaseClient = await supabaseClientPromise;
    if (!supabaseClient) return;
    if (await handleRecoverySession(supabaseClient)) return;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      await finishAuthentication(session.user);
      return;
    }
    const verified = localStorage.getItem('grove_verified') === 'true';
    verificationScreen.style.display = verified ? 'none' : 'flex';
    welcomeScreen.style.display = verified ? 'flex' : 'none';
    setLoginMode(false);
  } catch (error) {
    console.error('[onboarding] authentication initialization failed', error);
    showAuthMessage('We could not load authentication. Please refresh and try again.');
  }
})();
