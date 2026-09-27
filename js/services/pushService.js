import { getSupabase, getSupabaseSettings } from './supabaseClient.js';

const decodeKey = value => {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0));
};

const sameKey = (left, right) => {
  if (!left) return false;
  const a = new Uint8Array(left);
  const b = right instanceof Uint8Array ? right : new Uint8Array(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
};

async function context() {
  const [database, settings] = await Promise.all([getSupabase(), getSupabaseSettings()]);
  if (!database || !settings) throw new Error('Accounts are unavailable right now.');
  const { data: { session } } = await database.auth.getSession();
  if (!session?.access_token) throw new Error('Sign in to enable scheduled reminders.');
  const response = await fetch('/api/config', { headers: { Accept: 'application/json' } });
  const config = response.ok ? await response.json() : {};
  if (!config.pushConfigured || !config.vapidPublicKey) throw new Error('Scheduled reminders are not configured yet.');
  return { token: session.access_token, publicKey: config.vapidPublicKey };
}

const supported = () => Boolean('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window);

async function request(path, token, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'The reminder service could not complete this request.');
  return result;
}

export const pushService = {
  supported,
  async status() {
    if (!supported()) return { supported: false, subscribed: false, permission: 'unsupported' };
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return { supported: true, subscribed: Boolean(subscription), permission: Notification.permission };
  },
  async enable() {
    if (!supported()) throw new Error('This browser does not support scheduled Web Push reminders.');
    const { token, publicKey } = await context();
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notification permission was not granted. You can change it in the browser’s site settings.');
    const registration = await navigator.serviceWorker.ready;
    const applicationServerKey = decodeKey(publicKey);
    let subscription = await registration.pushManager.getSubscription();
    if (subscription && !sameKey(subscription.options?.applicationServerKey, applicationServerKey)) {
      await subscription.unsubscribe();
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }
    const result = await request('/api/push/subscribe', token, {
      subscription: subscription.toJSON(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
    return { ...result, subscription };
  },
  async disable() {
    if (!supported()) return { subscribed: false };
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { subscribed: false };
    let serverError = null;
    try {
      const { token } = await context();
      await request('/api/push/unsubscribe', token, { endpoint: subscription.endpoint });
    } catch (error) {
      serverError = error;
    } finally {
      // Always detach the browser. If the server was temporarily unavailable,
      // its next attempted delivery receives a gone response and disables the
      // orphaned endpoint. This protects people who share a device.
      await subscription.unsubscribe();
    }
    if (serverError) throw serverError;
    return { subscribed: false };
  },
};
