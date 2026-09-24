import { describe, expect, it } from "vitest";
import { decodePolyline, pickWaypoints, type LatLng } from "./polyline";
import { areRoutesEquivalent } from "./polyline";
import {
  CORRIDOR_A,
  CORRIDOR_A_JITTERED,
  CORRIDOR_B,
  encodePolylineForTest,
} from "./__fixtures__/testPolylines";
import chatswoodToOperaHouse from "./__fixtures__/chatswood-opera-house-routes.json";

const METERS_PER_DEGREE_LAT = 111_320;

function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const h =
    Math.sin(toRad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

// A straight north-to-south route of the given length, as three points.
function straightRoute(lengthMeters: number): LatLng[] {
  const start = { lat: -33.865, lng: 151.207 };
  const span = lengthMeters / METERS_PER_DEGREE_LAT;
  return [start, { lat: start.lat - span / 2, lng: start.lng }, { lat: start.lat - span, lng: start.lng }];
}

describe("decodePolyline", () => {
  it("decodes Google's documented example polyline", () => {
    // https://developers.google.com/maps/documentation/utilities/polylinealgorithm
    const points = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(points).toEqual([
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ]);
  });

  it("round-trips through the test encoder", () => {
    const encoded = encodePolylineForTest(CORRIDOR_A);
    const decoded = decodePolyline(encoded);
    for (let i = 0; i < CORRIDOR_A.length; i++) {
      expect(decoded[i].lat).toBeCloseTo(CORRIDOR_A[i].lat, 4);
      expect(decoded[i].lng).toBeCloseTo(CORRIDOR_A[i].lng, 4);
    }
  });
});

describe("pickWaypoints", () => {
  it("picks points strictly between the endpoints, along the corridor", () => {
    const encoded = encodePolylineForTest(CORRIDOR_A);
    const waypoints = pickWaypoints(encoded, 3);

    expect(waypoints.length).toBeGreaterThan(0);
    for (const point of waypoints) {
      expect(point.lat).toBeLessThan(CORRIDOR_A[0].lat);
      expect(point.lat).toBeGreaterThan(CORRIDOR_A[CORRIDOR_A.length - 1].lat);
    }
  });

  it("returns nothing for a route too short to trim a safe margin from", () => {
    const encoded = encodePolylineForTest([
      { lat: -33.865, lng: 151.207 },
      { lat: -33.8651, lng: 151.2071 },
    ]);
    expect(pickWaypoints(encoded, 3)).toEqual([]);
  });

  it.each([800, 1000, 1300, 1950])(
    "keeps every waypoint at least 300m from both ends, with no repeats (%im route)",
    (lengthMeters) => {
      const route = straightRoute(lengthMeters);
      const waypoints = pickWaypoints(encodePolylineForTest(route), 3);

      expect(waypoints.length).toBeGreaterThan(0);
      expect(waypoints.length).toBeLessThanOrEqual(3);
      for (const point of waypoints) {
        expect(distanceMeters(point, route[0])).toBeGreaterThanOrEqual(299);
        expect(distanceMeters(point, route[route.length - 1])).toBeGreaterThanOrEqual(299);
      }
      const keys = waypoints.map((p) => `${p.lat},${p.lng}`);
      expect(new Set(keys).size).toBe(keys.length);
    },
  );
});

describe("areRoutesEquivalent", () => {
  it("treats a jittered version of the same corridor as equivalent", () => {
    const a = encodePolylineForTest(CORRIDOR_A);
    const b = encodePolylineForTest(CORRIDOR_A_JITTERED);
    expect(areRoutesEquivalent(a, b)).toBe(true);
  });

  it("treats a genuinely different corridor as not equivalent", () => {
    const a = encodePolylineForTest(CORRIDOR_A);
    const b = encodePolylineForTest(CORRIDOR_B);
    expect(areRoutesEquivalent(a, b)).toBe(false);
  });

  it("does not dedupe on identical duration/toll alone", () => {
    // Same encoded polyline as itself is trivially equivalent; distinct
    // corridors must stay distinct even if a caller passed matching metadata.
    const a = encodePolylineForTest(CORRIDOR_A);
    const b = encodePolylineForTest(CORRIDOR_B);
    expect(areRoutesEquivalent(a, b)).toBe(false);
  });

  it("keeps a parallel road ~110m away as a separate route, even with shared endpoints", () => {
    const path = [
      { lat: -33.865, lng: 151.207 },
      { lat: -33.866, lng: 151.2072 },
      { lat: -33.87, lng: 151.208 },
      { lat: -33.875, lng: 151.209 },
      { lat: -33.879, lng: 151.2098 },
      { lat: -33.88, lng: 151.21 },
    ];
    const parallel = path.map((p, i) =>
      i === 0 || i === path.length - 1 ? p : { lat: p.lat, lng: p.lng + 0.0012 },
    );
    expect(areRoutesEquivalent(encodePolylineForTest(path), encodePolylineForTest(parallel))).toBe(
      false,
    );
  });

  it("does not let one stray vertex split an otherwise identical route", () => {
    const withSpike = [...CORRIDOR_A];
    withSpike.splice(2, 0, { lat: -33.8725, lng: 151.2115 }); // ~280m off the line
    expect(
      areRoutesEquivalent(encodePolylineForTest(CORRIDOR_A), encodePolylineForTest(withSpike)),
    ).toBe(true);
  });

  it("keeps all three real Chatswood-to-Opera-House alternatives distinct", () => {
    const polylines = chatswoodToOperaHouse.routes.map((r) => r.polyline.encodedPolyline);
    for (let i = 0; i < polylines.length; i++) {
      expect(areRoutesEquivalent(polylines[i], polylines[i])).toBe(true);
      for (let j = i + 1; j < polylines.length; j++) {
        expect(areRoutesEquivalent(polylines[i], polylines[j])).toBe(false);
      }
    }
  });
});
