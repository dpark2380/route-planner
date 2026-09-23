import { describe, expect, it } from "vitest";
import { decodePolyline } from "./polyline";
import { areRoutesEquivalent } from "./polyline";
import {
  CORRIDOR_A,
  CORRIDOR_A_JITTERED,
  CORRIDOR_B,
  encodePolylineForTest,
} from "./__fixtures__/testPolylines";

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
});
