export function requestCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation is not supported.'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 5 * 60 * 1000,
      timeout: 15000
    });
  });
}

export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Reverse geocoding failed');
    const data = await response.json();
    const city = data.city || data.locality || data.localityInfo?.administrative?.[3]?.name || '';
    const region = data.principalSubdivision || data.countryName || '';
    if (city && region && city !== region) return `${city}, ${region}`;
    return city || region || 'Your location';
  } catch {
    return 'Your location';
  }
}

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
