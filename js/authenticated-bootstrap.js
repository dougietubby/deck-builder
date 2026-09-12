import { getSupabase } from './supabase.js';
import { syncOneSignalUser } from './onesignal.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const client = await getSupabase();
    if (!client) return;
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) return;
    const { data: profile } = await client.from('profiles').select('camp,is_production').eq('id', session.user.id).maybeSingle();
    await syncOneSignalUser(session.user, profile);
    await client.functions.invoke('sync-onesignal-user', { body: {} });
  } catch (error) {
    console.warn('[authenticated-bootstrap] OneSignal sync deferred', error);
  }
});