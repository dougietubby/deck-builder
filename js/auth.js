// Shared auth helpers
import { getSupabase } from './supabase.js';
import { logoutOneSignal } from './onesignal.js';

export async function ensureProfile(user) {
  if (!user) return null;

  const supabaseClient = await getSupabase();
  if (!supabaseClient) return null;

  const { data, error } = await supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (error) {
    console.error('ensureProfile error', error);
  }

  if (!data) {
    // Profile doesn't exist; try to create it (fallback if trigger didn't run)
    const { data: insertedData, error: insertError } = await supabaseClient
      .from('profiles')
      .insert([{ id: user.id, display_name: user.email ? user.email.split('@')[0] : 'Grove' }])
      .select()
      .maybeSingle();
    if (insertError) {
      console.error('profile insert error', insertError);
      // Don't fail here; profile might exist via trigger
    }
    return insertedData || null;
  }

  return data;
}

export async function getProfile() {
  const supabaseClient = await getSupabase();
  if (!supabaseClient) return null;

  const { data: { session } } = await supabaseClient.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;
  const { data } = await supabaseClient.from('profiles').select('*').eq('id', uid).maybeSingle();
  return data;
}

export async function signOut() {
  const supabaseClient = await getSupabase();
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  // OneSignal logout if needed
  try { await logoutOneSignal(); } catch(e){}
  window.location.href = '/';
}
