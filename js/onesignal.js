const ONE_SIGNAL_APP_ID = 'e1d1cb65-fbf0-4a1f-a9d4-dcc90642cb28';

function getOneSignal() {
  if (window.__groveOneSignalPromise) return window.__groveOneSignalPromise;
  window.__groveOneSignalPromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.__groveOneSignalPromise = null;
      reject(new Error('OneSignal initialization timed out'));
    }, 10000);
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        window.clearTimeout(timeout);
        if (!window.__groveOneSignalInitialized) {
          await OneSignal.init({
            appId: ONE_SIGNAL_APP_ID,
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js'
          });
          window.__groveOneSignalInitialized = true;
        }
        resolve(OneSignal);
      } catch (error) {
        window.clearTimeout(timeout);
        window.__groveOneSignalPromise = null;
        reject(error);
      }
    });
  });
  return window.__groveOneSignalPromise;
}

export async function syncOneSignalUser(user, profile) {
  if (!user?.id) return false;
  const cacheKey = `${user.id}:${profile?.camp || localStorage.getItem('grove_camp') || 'unknown'}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const OneSignal = await getOneSignal();
      if (localStorage.getItem('grove_onesignal_sync') !== cacheKey) {
        await OneSignal.login(user.id);
        await OneSignal.User.addTags({
          grove_member: 'true',
          supabase_user_id: user.id,
          camp: profile?.camp || localStorage.getItem('grove_camp') || 'unknown'
        });
        localStorage.setItem('grove_onesignal_sync', cacheKey);
      }
      return true;
    } catch (error) {
      if (attempt === 2) {
        console.warn('OneSignal client sync deferred', error);
        return false;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  return false;
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
