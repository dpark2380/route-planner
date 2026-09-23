import type { LatLng } from "../polyline";

// Minimal encoder, test-only: the inverse of decodePolyline, used to build
// fixture polylines from readable lat/lng lists instead of hand-encoded strings.
export function encodePolylineForTest(points: LatLng[]): string {
  let result = "";
  let prevLat = 0;
  let prevLng = 0;

  for (const { lat, lng } of points) {
    result += encodeSignedValue(Math.round(lat * 1e5) - prevLat);
    result += encodeSignedValue(Math.round(lng * 1e5) - prevLng);
    prevLat = Math.round(lat * 1e5);
    prevLng = Math.round(lng * 1e5);
  }

  return result;
}

function encodeSignedValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let result = "";
  while (v >= 0x20) {
    result += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  result += String.fromCharCode(v + 63);
  return result;
}

// A straight line down George St, Sydney, roughly.
export const CORRIDOR_A: LatLng[] = [
  { lat: -33.865, lng: 151.207 },
  { lat: -33.87, lng: 151.208 },
  { lat: -33.875, lng: 151.209 },
  { lat: -33.88, lng: 151.21 },
];

// The same corridor with tiny jitter (should be treated as equivalent).
export const CORRIDOR_A_JITTERED: LatLng[] = CORRIDOR_A.map((p) => ({
  lat: p.lat + 0.0002,
  lng: p.lng + 0.0002,
}));

// A genuinely different corridor, several hundred metres away throughout.
export const CORRIDOR_B: LatLng[] = [
  { lat: -33.865, lng: 151.22 },
  { lat: -33.87, lng: 151.221 },
  { lat: -33.875, lng: 151.222 },
  { lat: -33.88, lng: 151.223 },
];
