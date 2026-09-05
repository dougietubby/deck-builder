export function renderNotification(template = '', variables = {}) {
  return template.replace(/\[([a-z_]+)\]/gi, (_, key) => variables[key] ?? `[${key}]`);
}

export async function sendAbilityNotification({ ability, sender, target, variables = {} }) {
  const message = renderNotification(ability.notificationTemplate, { display_name: sender?.display_name || 'A Grove member', ...variables, target });
  if (!message) return { sent: false, message: '' };
  if (!window.OneSignal) return { sent: false, message };
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    if (target?.userId) await OneSignal.User.pushSubscription.optIn();
    if (typeof OneSignal.Notifications?.addEventListener === 'function') OneSignal.Notifications.addEventListener('permissionChange', () => {});
  });
  return { sent: true, message };
}
