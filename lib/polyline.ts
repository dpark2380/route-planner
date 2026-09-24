export type LatLng = { lat: number; lng: number };

// Google's encoded polyline algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const decodeSignedValue = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += decodeSignedValue();
    lng += decodeSignedValue();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Resamples a polyline to points spaced ~intervalMeters apart along its length.
export function resamplePolyline(
  points: LatLng[],
  intervalMeters: number,
): LatLng[] {
  if (points.length < 2) return points;

  const resampled: LatLng[] = [points[0]];
  let carry = 0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const segmentLength = haversineMeters(prev, curr);
    if (segmentLength === 0) continue;

    let distanceIntoSegment = intervalMeters - carry;
    while (distanceIntoSegment < segmentLength) {
      const t = distanceIntoSegment / segmentLength;
      resampled.push({
        lat: prev.lat + (curr.lat - prev.lat) * t,
        lng: prev.lng + (curr.lng - prev.lng) * t,
      });
      distanceIntoSegment += intervalMeters;
    }
    carry = distanceIntoSegment - segmentLength;
  }

  resampled.push(points[points.length - 1]);
  return resampled;
}

// Picks up to `count` waypoints spread evenly along the route, trimming a
// margin off each end so waypoints don't land on entrance/exit ramps right
// next to the origin/destination (spec section 6).
const WAYPOINT_END_MARGIN_METERS = 300;

export function pickWaypoints(encoded: string, count: number): LatLng[] {
  if (count <= 0) return [];

  const points = decodePolyline(encoded);
  if (points.length < 3) return [];
  const start = points[0];
  const end = points[points.length - 1];

  // resamplePolyline always appends the exact endpoint, so the last 300m mark
  // can sit arbitrarily close to the destination; filter both ends explicitly.
  const candidates = resamplePolyline(points, WAYPOINT_END_MARGIN_METERS)
    .slice(1, -1)
    .filter(
      (point) =>
        haversineMeters(point, start) >= WAYPOINT_END_MARGIN_METERS &&
        haversineMeters(point, end) >= WAYPOINT_END_MARGIN_METERS,
    );

  // With no more candidates than requested, spreading them would repeat points.
  if (candidates.length <= count) return candidates;

  const waypoints: LatLng[] = [];
  for (let i = 1; i <= count; i++) {
    waypoints.push(candidates[Math.floor((i * candidates.length) / (count + 1))]);
  }
  return waypoints;
}

function nearestDistance(point: LatLng, others: LatLng[]): number {
  let min = Infinity;
  for (const other of others) {
    const d = haversineMeters(point, other);
    if (d < min) min = d;
  }
  return min;
}

const SAMPLE_INTERVAL_METERS = 50;
const ENDPOINT_DISTANCE_THRESHOLD_METERS = 100;
// Bulk check: the same corridor stays within noise of itself for most of its
// length, so parallel roads 80m+ apart are kept as separate options.
const MEDIAN_DISTANCE_THRESHOLD_METERS = 75;
// Divergence check: routes sharing their approaches but splitting for a
// stretch (e.g. Harbour Bridge vs Tunnel) pass the median test, so also reject
// any sustained stretch that sits far apart. Counting points rather than
// taking a percentile keeps one stray point on a short route from deciding
// the result. Calibrated on the real Chatswood-to-Opera-House alternatives in
// lib/__fixtures__/chatswood-opera-house-routes.json.
const DIVERGENCE_DISTANCE_METERS = 200;
const MAX_DIVERGENT_LENGTH_METERS = 300;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// Two routes are treated as the same corridor when their endpoints coincide,
// they run together for most of their length, and they never split apart for
// a meaningful stretch. Thresholds are starting points to tune against real
// Sydney trips (spec section 10).
export function areRoutesEquivalent(
  encodedA: string,
  encodedB: string,
): boolean {
  const pointsA = decodePolyline(encodedA);
  const pointsB = decodePolyline(encodedB);
  if (pointsA.length === 0 || pointsB.length === 0) return false;

  const startDistance = haversineMeters(pointsA[0], pointsB[0]);
  const endDistance = haversineMeters(
    pointsA[pointsA.length - 1],
    pointsB[pointsB.length - 1],
  );
  if (
    startDistance > ENDPOINT_DISTANCE_THRESHOLD_METERS ||
    endDistance > ENDPOINT_DISTANCE_THRESHOLD_METERS
  ) {
    return false;
  }

  const sampledA = resamplePolyline(pointsA, SAMPLE_INTERVAL_METERS);
  const sampledB = resamplePolyline(pointsB, SAMPLE_INTERVAL_METERS);
  // Symmetric: checked both directions since sample counts/density can differ.
  const distancesAtoB = sampledA.map((p) => nearestDistance(p, sampledB));
  const distancesBtoA = sampledB.map((p) => nearestDistance(p, sampledA));

  if (Math.max(median(distancesAtoB), median(distancesBtoA)) > MEDIAN_DISTANCE_THRESHOLD_METERS) {
    return false;
  }

  const divergentPoints = Math.max(
    distancesAtoB.filter((d) => d > DIVERGENCE_DISTANCE_METERS).length,
    distancesBtoA.filter((d) => d > DIVERGENCE_DISTANCE_METERS).length,
  );
  return divergentPoints * SAMPLE_INTERVAL_METERS < MAX_DIVERGENT_LENGTH_METERS;
}
