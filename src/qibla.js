const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

const deg = d => d * Math.PI / 180;
const rad = r => r * 180 / Math.PI;
export function calculateQiblaBearing(lat, lon) {
  const phi1 = deg(lat), phi2 = deg(KAABA_LAT), dl = deg(KAABA_LON - lon);
  const y = Math.sin(dl);
  const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(dl);
  return (rad(Math.atan2(y, x)) + 360) % 360;
}
export function qiblaDirectionName(bearing) {
  const dirs = ['north','north-northeast','northeast','east-northeast','east','east-southeast','southeast','south-southeast','south','south-southwest','southwest','west-southwest','west','west-northwest','northwest','north-northwest'];
  return dirs[Math.round(bearing / 22.5) % 16];
}
