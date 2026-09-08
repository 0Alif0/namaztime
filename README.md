# Namaz — Polished Simple PWA

A simple iPhone-first Namaz PWA focused on prayer times, Qibla, Tahajjud/Last Third, Islamic date/special day, and push-notification preferences.

## Default behavior
- Default calculation: Islamic Society of North America (ISNA)
- Standard Asr
- No audio or Azan playback
- Default fallback location for testing: Brooklyn, New York (40.64, -73.98, America/New_York)
- GPS can replace the fallback location from the main screen

## GitHub Pages
Upload the project contents to the repository root and enable GitHub Pages from the `main` branch, root folder.

The frontend works without a backend for prayer calculations and Qibla. Notification preferences are saved locally. Real background Web Push delivery needs the included backend configured on a server such as Hostinger.

## Hostinger push backend
See `server/server.js`. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and database settings in environment variables. The frontend `src/notifications.js` is intentionally safe when no backend URL is configured.
