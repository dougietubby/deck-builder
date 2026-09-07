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

function describeUrlState() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const all = {
    href: window.location.href,
    search: Object.fromEntries(params.entries()),
    hash: Object.fromEntries(hash.entries()),
  };
  console.log('[auth-callback] callback URL state', all);
  return all;
}

async function waitForSession(client, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
      console.warn('[auth-callback] session polling error', error);
    }
    if (session?.user) {
      console.log('[auth-callback] session present after polling', session.user.id);
      return session;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

async function handleCallback() {
  const client = await getSupabase();
  if (!client) {
    console.error('[auth-callback] Supabase client missing from callback page');
    showError('Supabase is not configured yet. Please return to the login screen and try again.');
    return;
  }

  console.log('[auth-callback] starting magic-link callback handling');
  describeUrlState();

  try {
    setStatus('Authenticating camper...');

    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const code = params.get('code') || hash.get('code');

    if (code) {
      console.log('[auth-callback] PKCE code detected, exchanging code for session');
      const { data: exchangeData, error: exchangeError } = await client.auth.exchangeCodeForSession(code);
      console.log('[auth-callback] exchangeCodeForSession result', exchangeError || exchangeData?.session?.user?.id || 'no session yet');
      if (exchangeError) {
        console.error('[auth-callback] exchangeCodeForSession failed', exchangeError);
      }
    }

    const { data, error } = await client.auth.getSessionFromUrl({ storeSession: true });
    console.log('[auth-callback] getSessionFromUrl response', { error: error ? error.message || error : null, user: data?.session?.user?.id || null });
    if (error) {
      console.warn('[auth-callback] getSessionFromUrl returned error', error);
    }

    let session = data?.session || await waitForSession(client);
    if (!session?.user) {
      const paramsError = params.get('error') || hash.get('error') || params.get('error_code') || hash.get('error_code');
      console.warn('[auth-callback] no session found after exchange', { paramsError, search: Object.fromEntries(params.entries()), hash: Object.fromEntries(hash.entries()) });
      if (paramsError) {
        showError('We couldn\'t sign you in. Your magic link may have expired. Please request a new one.');
        return;
      }
      showError('We couldn\'t sign you in. Please request a new magic link and try again.');
      return;
    }

    setStatus('Preparing your camp...');
    const user = session.user;
    console.log('[auth-callback] authenticated user', user.id, user.email);

    const profile = await ensureProfile(user);
    console.log('[auth-callback] ensureProfile completed', profile ? profile.id : null);
    if (!profile) {
      throw new Error('Profile unavailable after authentication');
    }

    try {
      await syncOneSignalUser(user, profile);
      console.log('[auth-callback] OneSignal sync complete');
    } catch (syncError) {
      console.warn('[auth-callback] OneSignal sync skipped after auth callback', syncError);
    }

    localStorage.setItem('grove_onboarded', 'true');
    console.log('[auth-callback] final redirect to /home');
    window.location.replace('/home/');
  } catch (error) {
    console.error('[auth-callback] Auth callback failure', error);
    showError('We couldn\'t sign you in. Your magic link may have expired. Please request a new magic link.');
  }
}

handleCallback();
