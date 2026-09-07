import { getSupabase } from './supabase.js';
import { ensureProfile } from './auth.js';
import { syncOneSignalUser } from './onesignal.js';

const authStatus = document.getElementById('authStatus');
const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');

function setStatus(message) {
  authStatus.textContent = message;
}

function showError(message) {
  errorMessage.textContent = message;
  errorBox.classList.add('show');
  authStatus.textContent = 'Preparing your camp...';
}

async function waitForSession(client, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
      console.warn('Session polling error', error);
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
    showError('Supabase is not configured yet. Please return to the login screen and try again.');
    return;
  }

  try {
    setStatus('Authenticating camper...');
    const { data, error } = await client.auth.getSessionFromUrl({ storeSession: true });
    if (error) {
      console.warn('Magic link callback error', error);
    }

    let session = data?.session || await waitForSession(client);
    if (!session?.user) {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hasTokenError = params.get('error') || hash.get('error') || params.get('error_code') || hash.get('error_code');
      if (hasTokenError) {
        showError('We couldn\'t sign you in. Your magic link may have expired. Please request a new one.');
        return;
      }
      showError('We couldn\'t sign you in. Please request a new magic link and try again.');
      return;
    }

    setStatus('Preparing your camp...');
    const user = session.user;

    const profile = await ensureProfile(user);
    if (!profile) {
      throw new Error('Profile unavailable after authentication');
    }

    try {
      await syncOneSignalUser(user, profile);
    } catch (syncError) {
      console.warn('OneSignal sync skipped after auth callback', syncError);
    }

    localStorage.setItem('grove_onboarded', 'true');
    window.location.replace('/home/');
  } catch (error) {
    console.error('Auth callback failure', error);
    showError('We couldn\'t sign you in. Your magic link may have expired. Please request a new magic link.');
  }
}

handleCallback();
