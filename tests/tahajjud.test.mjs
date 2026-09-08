import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePrayerTimes } from '../src/prayerEngine.js';

const location = { latitude: 40.64, longitude: -73.98, timezone: 'America/New_York' };

test("Tahajjud / Last Third ends at today's Fajr and stays before Fajr", () => {
  const yesterday = calculatePrayerTimes({ ...location, dateParts: [2026, 9, 7] });
  const today = calculatePrayerTimes({ ...location, dateParts: [2026, 9, 8] });

  assert.ok(Number.isFinite(yesterday.maghrib));
  assert.ok(Number.isFinite(today.fajr));
  assert.ok(today.fajr > yesterday.maghrib);

  const lastThirdStart = yesterday.maghrib + ((today.fajr - yesterday.maghrib) * 2 / 3);
  assert.ok(lastThirdStart > yesterday.maghrib);
  assert.ok(lastThirdStart < today.fajr);
});
