const SETTINGS_KEY = 'namaz.push.settings.v1';
const PUSH_API_BASE = '';

export function notificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

export function loadPushSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}

export function savePushSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function base64ToBytes(value) {
  const pad = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function getVapidKey() {
  if (!PUSH_API_BASE) return null;
  const response = await fetch(`${PUSH_API_BASE}/api/vapid-public-key`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Push server is unavailable.');
  const data = await response.json();
  return data.publicKey || null;
}

export async function enablePush(location, notifications) {
  if (!notificationsSupported()) throw new Error('Install Namaz on your iPhone Home Screen to use push notifications.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');
  const registration = await navigator.serviceWorker.ready;
  const publicKey = await getVapidKey();
  if (!publicKey) return { localOnly: true };
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToBytes(publicKey)
    });
  }
  const response = await fetch(`${PUSH_API_BASE}/api/push/subscribe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, location, notifications })
  });
  if (!response.ok) throw new Error('Could not register this iPhone for push notifications.');
  return { localOnly: false };
}
