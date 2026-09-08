import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrayerTimes } from '../src/prayerEngine.js';
import { calculateQiblaBearing } from '../src/qibla.js';

const cfg = { latitude: 40.64, longitude: -73.98, dateParts: [2026,9,8], timezone: 'America/New_York' };

test('New York Sep 8 2026 prayer times are sensible for ISNA', () => {
  const t = calculatePrayerTimes(cfg);
  const minutes = k => new Date(t[k]).toLocaleTimeString('en-US', { timeZone: cfg.timezone, hour: 'numeric', minute: '2-digit', hour12: false });
  assert.match(minutes('fajr'), /^0?5:/);
  assert.match(minutes('sunrise'), /^0?6:/);
  assert.match(minutes('dhuhr'), /^12:/);
  assert.match(minutes('asr'), /^16:/);
  assert.match(minutes('maghrib'), /^19:/);
  assert.match(minutes('isha'), /^20:/);
  assert.ok(t.fajr < t.sunrise && t.sunrise < t.dhuhr && t.dhuhr < t.asr && t.asr < t.maghrib && t.maghrib < t.isha);
});

test('Asr is afternoon, not an impossible late-evening result', () => {
  const t = calculatePrayerTimes(cfg);
  const hours = Number(new Intl.DateTimeFormat('en-US',{timeZone:cfg.timezone,hour:'2-digit',hour12:false}).format(new Date(t.asr)));
  assert.ok(hours >= 15 && hours <= 18, `Asr hour was ${hours}`);
});

test('New York Qibla is about 59 degrees', () => {
  const bearing = calculateQiblaBearing(40.64, -73.98);
  assert.ok(Math.abs(bearing - 59) < 1, `bearing ${bearing}`);
});
