// OneSignal helper: link Supabase user.id as external_id and manage tags
export async function syncOneSignalUser(user, profile) {
  if (!window.OneSignal) return;
  try {
    // Ensure OneSignal SDK is ready and perform login
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.login(user.id);
        await OneSignal.User.addTags({ grove_member: 'true', camp: profile?.camp || localStorage.getItem('grove_camp') || 'unknown' });
      } catch (e) {
        console.error('syncOneSignalUser error', e);
      }
    });
  } catch (e) {
    console.error('syncOneSignalUser outer error', e);
  }
}

export async function logoutOneSignal() {
  if (!window.OneSignal) return;
  try {
    // Attempt to logout / reset external id
    if (window.OneSignal && typeof window.OneSignal.logout === 'function') {
      await window.OneSignal.logout();
    }
  } catch (e) {
    console.error('logoutOneSignal error', e);
  }
}
