// Shared auth helpers
import { getSupabase } from './supabase.js';
import { logoutOneSignal } from './onesignal.js';

const supabaseClient = getSupabase();

export async function ensureProfile(user) {
  if (!user) return null;

  const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) {
    console.error('ensureProfile error', error);
  }

  if (!data) {
    const insert = await supabaseClient.from('profiles').insert([{ id: user.id, display_name: user.email ? user.email.split('@')[0] : 'Grove' }]);
    if (insert.error) console.error('profile insert error', insert.error);
    return insert.data ? insert.data[0] : null;
  }

  return data;
}

export async function getProfile() {
  const { data: session } = await supabaseClient.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data } = await supabaseClient.from('profiles').select('*').eq('id', uid).maybeSingle();
  return data;
}

export async function signOut() {
  await supabaseClient.auth.signOut();
  // OneSignal logout if needed
  try { await logoutOneSignal(); } catch(e){}
  window.location.href = '/';
}
