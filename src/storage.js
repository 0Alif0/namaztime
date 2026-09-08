const LOCATION_KEY = 'namaz.location.v2';
const NOTIF_KEY = 'namaz.notifications.v2';

export const DEFAULT_LOCATION = {
  name: 'Brooklyn, New York',
  lat: 40.6782,
  lon: -73.9442,
  timezone: 'America/New_York'
};

const DEFAULT_NOTIFICATIONS = {
  fajr: true,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
  tahajjud: true
};

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch { return fallback; }
}

export function loadLocation() { return read(LOCATION_KEY, DEFAULT_LOCATION); }
export function saveLocation(value) { localStorage.setItem(LOCATION_KEY, JSON.stringify(value)); }
export function loadNotifications() { return { ...DEFAULT_NOTIFICATIONS, ...read(NOTIF_KEY, {}) }; }
export function saveNotifications(value) { localStorage.setItem(NOTIF_KEY, JSON.stringify(value)); }
