/*
 * praytime.js - adapted from PrayTime v3.2
 * Original algorithm/library: Hamid Zarrabi-Zadeh, https://praytimes.org
 * Source: https://github.com/zarrabi/praytime
 * License: MIT
 *
 * This local copy is intentionally kept in the project so prayer calculations
 * do not depend on a CDN or third-party runtime request.
 */
export class PrayTime {
  constructor(method = 'MWL') {
    this.methods = {
      MWL: { fajr: 18, isha: 17 },
      ISNA: { fajr: 15, isha: 15 },
      NorthAmerica: { fajr: 17.5, isha: 15 },
      Egypt: { fajr: 19.5, isha: 17.5 },
      Makkah: { fajr: 18.5, isha: '90 min' },
      Karachi: { fajr: 18, isha: 18 },
      Tehran: { fajr: 17.7, maghrib: 4.5, midnight: 'Jafari' },
      Jafari: { fajr: 16, maghrib: 4, midnight: 'Jafari' },
      France: { fajr: 12, isha: 12 },
      defaults: { isha: 14, maghrib: '1 min', midnight: 'Standard' }
    };
    this.settings = {
      dhuhr: '0 min',
      asr: 'Standard',
      highLats: 'AngleBased',
      tune: {},
      rounding: 'nearest',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      location: [0, 0],
      iterations: 1
    };
    this.method(method);
  }

  set(settings) { Object.assign(this.settings, settings); return this; }
  method(method) { return this.set(this.methods.defaults).set(this.methods[method] || this.methods.MWL); }
  location(location) { return this.set({ location }); }
  timezone(timezone) { return this.set({ timezone }); }
  adjust(params) { return this.set(params); }
  tune(tune) { return this.set({ tune }); }
  round(rounding = 'nearest') { return this.set({ rounding }); }

  times(date) {
    if (Array.isArray(date)) {
      this.utcTime = Date.UTC(date[0], date[1] - 1, date[2]);
    } else {
      const d = date instanceof Date ? date : new Date();
      this.utcTime = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    }
    let times = this.computeTimes();
    return this.toTimestamps(times);
  }

  computeTimes() {
    let times = { fajr:5, sunrise:6, dhuhr:12, asr:13, sunset:18, maghrib:18, isha:18, midnight:24 };
    for (let i = 0; i < this.settings.iterations; i++) times = this.processTimes(times);
    this.adjustHighLats(times);
    this.updateTimes(times);
    this.tuneTimes(times);
    return times;
  }

  processTimes(times) {
    const p = this.settings;
    const horizon = 0.833;
    return {
      fajr: this.angleTime(p.fajr, times.fajr, -1),
      sunrise: this.angleTime(horizon, times.sunrise, -1),
      dhuhr: this.midDay(times.dhuhr),
      asr: this.angleTime(this.asrAngle(p.asr, times.asr), times.asr),
      sunset: this.angleTime(horizon, times.sunset),
      maghrib: this.angleTime(p.maghrib, times.maghrib),
      isha: this.angleTime(p.isha, times.isha),
      midnight: this.midDay(times.midnight) + 12
    };
  }

  updateTimes(times) {
    const p = this.settings;
    if (this.isMin(p.maghrib)) times.maghrib = times.sunset + this.value(p.maghrib) / 60;
    if (this.isMin(p.isha)) times.isha = times.maghrib + this.value(p.isha) / 60;
    if (p.midnight === 'Jafari') {
      const nextFajr = this.angleTime(p.fajr, 29, -1) + 24;
      times.midnight = (times.sunset + (this.adjusted ? times.fajr + 24 : nextFajr)) / 2;
    }
    times.dhuhr += this.value(p.dhuhr) / 60;
  }

  tuneTimes(times) {
    for (const k in times) if (k in this.settings.tune) times[k] += this.settings.tune[k] / 60;
  }

  toTimestamps(times) {
    const lng = this.settings.location[1];
    const out = {};
    for (const [k, v] of Object.entries(times)) {
      const hours = v - lng / 15;
      const raw = this.utcTime + Math.floor(hours * 3600000);
      out[k] = this.roundTimestamp(raw);
    }
    return out;
  }

  roundTimestamp(timestamp) {
    const mode = { up: Math.ceil, down: Math.floor, nearest: Math.round }[this.settings.rounding];
    if (!mode) return timestamp;
    return mode(timestamp / 60000) * 60000;
  }

  sunPosition(time) {
    const lng = this.settings.location[1];
    const D = this.utcTime / 864e5 - 10957.5 + this.value(time) / 24 - lng / 360;
    const g = this.mod(357.529 + 0.98560028 * D, 360);
    const q = this.mod(280.459 + 0.98564736 * D, 360);
    const L = this.mod(q + 1.915 * this.sin(g) + 0.020 * this.sin(2 * g), 360);
    const e = 23.439 - 0.00000036 * D;
    const RA = this.mod(this.arctan2(this.cos(e) * this.sin(L), this.cos(L)) / 15, 24);
    return { declination: this.arcsin(this.sin(e) * this.sin(L)), equation: q / 15 - RA };
  }

  midDay(time) { return this.mod(12 - this.sunPosition(time).equation, 24); }

  angleTime(angle, time, direction = 1) {
    const lat = this.settings.location[0];
    const decl = this.sunPosition(time).declination;
    const denom = this.cos(lat) * this.cos(decl);
    const value = (-this.sin(angle) - this.sin(lat) * this.sin(decl)) / denom;
    if (value < -1 || value > 1) return NaN;
    const diff = this.arccos(value) / 15;
    return this.midDay(time) + diff * direction;
  }

  asrAngle(asrParam, time) {
    const shadowFactor = ({ Standard: 1, Hanafi: 2 })[asrParam] || this.value(asrParam);
    const lat = this.settings.location[0];
    const decl = this.sunPosition(time).declination;
    return -this.arccot(shadowFactor + this.tan(Math.abs(lat - decl)));
  }

  adjustHighLats(times) {
    const p = this.settings;
    if (p.highLats === 'None') return;
    this.adjusted = false;
    const night = 24 + times.sunrise - times.sunset;
    Object.assign(times, {
      fajr: this.adjustTime(times.fajr, times.sunrise, p.fajr, night, -1),
      isha: this.adjustTime(times.isha, times.sunset, p.isha, night),
      maghrib: this.adjustTime(times.maghrib, times.sunset, p.maghrib, night)
    });
  }

  adjustTime(time, base, angle, night, direction = 1) {
    const factors = { NightMiddle: .5, OneSeventh: 1/7, AngleBased: this.value(angle) / 60 };
    const portion = factors[this.settings.highLats] * night;
    const timeDiff = (time - base) * direction;
    if (isNaN(time) || timeDiff > portion) { time = base + portion * direction; this.adjusted = true; }
    return time;
  }

  value(str) { return +String(str).split(/[^0-9.+-]/)[0]; }
  isMin(str) { return String(str).includes('min'); }
  mod(a,b) { return ((a % b) + b) % b; }
  dtr(d) { return d * Math.PI / 180; }
  rtd(r) { return r * 180 / Math.PI; }
  sin(d) { return Math.sin(this.dtr(d)); }
  cos(d) { return Math.cos(this.dtr(d)); }
  tan(d) { return Math.tan(this.dtr(d)); }
  arcsin(d) { return this.rtd(Math.asin(d)); }
  arccos(d) { return this.rtd(Math.acos(d)); }
  arccot(x) { return this.rtd(Math.atan(1 / x)); }
  arctan2(y,x) { return this.rtd(Math.atan2(y,x)); }
}
