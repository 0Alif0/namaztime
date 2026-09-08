import { PrayTime } from '../vendor/praytime.js';

export function calculatePrayerTimes({ latitude, longitude, dateParts, timezone }) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('Invalid latitude');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Invalid longitude');
  if (!Array.isArray(dateParts) || dateParts.length !== 3) throw new Error('dateParts must be [year, month, day]');
  if (!timezone) throw new Error('Timezone is required');

  const engine = new PrayTime('ISNA');
  engine.location([latitude, longitude])
    .timezone(timezone)
    .adjust({ asr: 'Standard', highLats: 'AngleBased' })
    .round('nearest');

  return engine.times(dateParts);
}

export function getDatePartsInZone(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return [Number(map.year), Number(map.month), Number(map.day)];
}

export function addDaysToParts([year, month, day], days) {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
}

export function formatTime(timestamp, timezone) {
  if (!Number.isFinite(timestamp)) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true
  }).format(new Date(timestamp));
}

export function formatDate(date, timezone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'long', month: 'long', day: 'numeric'
  }).format(date);
}

export function formatHijri(date, timezone) {
  const fmt = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
    timeZone: timezone, day: 'numeric', month: 'long', year: 'numeric'
  });
  return fmt.format(date).replace(/AH$/, 'AH');
}
