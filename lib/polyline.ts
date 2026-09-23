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

function nearestDistance(point: LatLng, others: LatLng[]): number {
  let min = Infinity;
  for (const other of others) {
    const d = haversineMeters(point, other);
    if (d < min) min = d;
  }
  return min;
}

const SAMPLE_INTERVAL_METERS = 50;
const MATCH_DISTANCE_THRESHOLD_METERS = 75;
const ENDPOINT_DISTANCE_THRESHOLD_METERS = 100;

// Two routes are treated as the same corridor when their resampled points
// stay close together throughout, and their endpoints coincide.
// Thresholds are starting points to tune against real Sydney trips (spec section 10).
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
  const distances = sampledA.map((p) => nearestDistance(p, sampledB));
  distances.sort((a, b) => a - b);
  const median = distances[Math.floor(distances.length / 2)];

  return median <= MATCH_DISTANCE_THRESHOLD_METERS;
}
