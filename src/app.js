import { calculatePrayerTimes, getDatePartsInZone, addDaysToParts, formatTime } from './prayerEngine.js';
import { calculateQiblaBearing, qiblaDirectionName } from './qibla.js';
import { getHijri, getSpecialEvent } from './islamicCalendar.js';
import { loadLocation, saveLocation, loadNotifications, saveNotifications } from './storage.js';
import { requestCurrentLocation, reverseGeocode, browserTimezone } from './location.js';
import { enablePush } from './notifications.js';

const $ = id => document.getElementById(id);
const state = {
  location: loadLocation(),
  notifications: loadNotifications(),
  qibla: 59,
  compassHeading: null,
  orientationHandler: null
};

const PRAYERS = [
  ['Fajr','fajr'], ['Sunrise','sunrise'], ['Dhuhr','dhuhr'], ['Asr','asr'], ['Maghrib','maghrib'], ['Isha','isha']
];
const NOTIFICATIONS = [
  ['Fajr','fajr'], ['Dhuhr','dhuhr'], ['Asr','asr'], ['Maghrib','maghrib'], ['Isha','isha'], ['Tahajjud','tahajjud']
];

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function getLocalParts() { return getDatePartsInZone(new Date(), state.location.timezone); }
function getTimesFor(parts) {
  return calculatePrayerTimes({
    latitude: state.location.lat,
    longitude: state.location.lon,
    dateParts: parts,
    timezone: state.location.timezone
  });
}

function renderPrayerRows(times) {
  const now = Date.now();
  const order = PRAYERS.filter(([, key]) => Number.isFinite(times[key]));
  let currentKey = null;
  for (let i = 0; i < order.length - 1; i++) {
    if (now >= times[order[i][1]] && now < times[order[i + 1][1]]) currentKey = order[i][1];
  }
  if (now >= times.isha) currentKey = 'isha';

  $('prayers').innerHTML = order.map(([label, key]) => `
    <div class="prayer-row ${key === currentKey ? 'current' : ''}">
      <span class="label">${label}</span>
      <span class="time">${formatTime(times[key], state.location.timezone)}</span>
    </div>`).join('');
}

function renderNotifications() {
  $('notificationRows').innerHTML = NOTIFICATIONS.map(([label, key]) => {
    const checked = !!state.notifications[key];
    return `
      <label class="notification-row" for="n-${key}">
        <span>${label}</span>
        <span class="toggle-text">${checked ? 'ON' : 'OFF'}</span>
        <span class="switch">
          <input id="n-${key}" data-key="${key}" type="checkbox" ${checked ? 'checked' : ''}>
          <span class="slider"></span>
        </span>
      </label>`;
  }).join('');

  document.querySelectorAll('#notificationRows input[data-key]').forEach(input => {
    input.addEventListener('change', async e => {
      const key = e.target.dataset.key;
      state.notifications[key] = e.target.checked;
      saveNotifications(state.notifications);
      if (e.target.checked) {
        try {
          const result = await enablePush(state.location, state.notifications);
          showToast(result.localOnly ? 'Saved. Push server still needs to be connected.' : 'Prayer push notifications enabled.');
        } catch (error) {
          showToast(error.message || 'Could not enable notifications.');
        }
      } else {
        showToast(`${key === 'tahajjud' ? 'Tahajjud' : key[0].toUpperCase()+key.slice(1)} reminder off.`);
      }
      updateNotificationStatus();
      renderNotifications();
    });
  });
  updateNotificationStatus();
}

function updateNotificationStatus() {
  const selected = NOTIFICATIONS.filter(([, key]) => state.notifications[key]).length;
  $('notificationStatus').textContent = selected
    ? `${selected} prayer reminder${selected === 1 ? '' : 's'} selected. Push only.`
    : 'Prayer reminders are muted.';
}

function setupNotifications() {
  $('muteAll').addEventListener('click', () => {
    for (const [, key] of NOTIFICATIONS) state.notifications[key] = false;
    saveNotifications(state.notifications);
    renderNotifications();
    showToast('All prayer reminders muted.');
  });
  $('enableAll').addEventListener('click', async () => {
    for (const [, key] of NOTIFICATIONS) state.notifications[key] = true;
    saveNotifications(state.notifications);
    renderNotifications();
    try {
      const result = await enablePush(state.location, state.notifications);
      showToast(result.localOnly ? 'All enabled. Push server still needs to be connected.' : 'All prayer push notifications enabled.');
    } catch (error) {
      showToast(error.message || 'Could not enable notifications.');
    }
  });
}

async function setupLocation() {
  $('locationButton').addEventListener('click', async () => {
    const button = $('locationButton');
    button.disabled = true;
    const old = button.textContent;
    button.textContent = 'Finding…';
    try {
      const pos = await requestCurrentLocation();
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const name = await reverseGeocode(lat, lon);
      state.location = { name, lat, lon, timezone: browserTimezone() };
      saveLocation(state.location);
      render();
      showToast('Location updated.');
    } catch {
      showToast('Location could not be updated. Using the saved location.');
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  });
}

function setupCompass() {
  $('compassButton').addEventListener('click', async () => {
    if (typeof DeviceOrientationEvent === 'undefined') {
      showToast(`Compass unavailable. Qibla is ${Math.round(state.qibla)}° from true north.`);
      return;
    }
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvent.requestPermission();
        if (result !== 'granted') throw new Error('Permission not granted');
      } catch {
        showToast('Compass permission was not granted.');
        return;
      }
    }

    if (state.orientationHandler) window.removeEventListener('deviceorientation', state.orientationHandler, true);
    state.orientationHandler = event => {
      const heading = event.webkitCompassHeading ?? (event.absolute && event.alpha != null ? 360 - event.alpha : null);
      if (!Number.isFinite(heading)) return;
      state.compassHeading = heading;
      const delta = ((state.qibla - heading + 540) % 360) - 180;
      $('qiblaArrow').style.transform = `translate(-50%, -100%) rotate(${delta}deg)`;
      $('compassButton').textContent = 'Compass is on';
    };
    window.addEventListener('deviceorientation', state.orientationHandler, true);
    showToast('Compass is on. Rotate your phone toward the arrow.');
  });
}

function render() {
  const now = new Date();
  const localParts = getLocalParts();
  const todayTimes = getTimesFor(localParts);
  const tomorrowParts = addDaysToParts(localParts, 1);
  const tomorrowTimes = getTimesFor(tomorrowParts);

  const hijri = getHijri(now, state.location.timezone);
  const special = getSpecialEvent(hijri);

  $('gregorian').textContent = new Intl.DateTimeFormat('en-US', {
    timeZone: state.location.timezone, weekday: 'long', month: 'long', day: 'numeric'
  }).format(now);
  $('hijri').textContent = hijri.label;
  $('locationName').textContent = state.location.name || 'Your location';

  if (special) {
    $('special').textContent = special;
    $('special').classList.remove('hidden');
  } else {
    $('special').classList.add('hidden');
    $('special').textContent = '';
  }

  renderPrayerRows(todayTimes);

  // Tahajjud is shown as the FINAL THIRD of the night: from 2/3 of the way
  // through the previous evening's Maghrib-to-Fajr night, up to today's Fajr.
  // The end time is the same Fajr value shown in Today's Prayer Times.
  const yesterdayParts = addDaysToParts(localParts, -1);
  const yesterdayTimes = getTimesFor(yesterdayParts);
  const nightStart = yesterdayTimes.maghrib;
  const nightEnd = todayTimes.fajr;
  if (Number.isFinite(nightStart) && Number.isFinite(nightEnd) && nightEnd > nightStart) {
    const lastThirdStart = nightStart + ((nightEnd - nightStart) * 2 / 3);
    $('tahajjudTime').textContent = `${formatTime(lastThirdStart, state.location.timezone)} – ${formatTime(nightEnd, state.location.timezone)}`;
  } else {
    $('tahajjudTime').textContent = '—';
  }

  state.qibla = calculateQiblaBearing(state.location.lat, state.location.lon);
  $('qiblaValue').textContent = `${Math.round(state.qibla)}°`;
  $('qiblaDirection').textContent = `${qiblaDirectionName(state.qibla)} of true north`;
  $('qiblaArrow').style.transform = `translate(-50%, -100%) rotate(${state.qibla}deg)`;

  renderNotifications();
}

setupNotifications();
setupLocation();
setupCompass();
render();
setInterval(() => render(), 60_000);
