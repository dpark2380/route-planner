import { describe, expect, it } from "vitest";
import {
  normalizeRoutes,
  tollFromGoogleRoute,
  type GoogleComputeRoute,
  type GoogleComputeRoutesResponse,
} from "./normalizeRoutes";
import {
  CORRIDOR_A,
  CORRIDOR_A_JITTERED,
  CORRIDOR_B,
  encodePolylineForTest,
} from "./__fixtures__/testPolylines";

const corridorA = encodePolylineForTest(CORRIDOR_A);
const corridorAJittered = encodePolylineForTest(CORRIDOR_A_JITTERED);
const corridorB = encodePolylineForTest(CORRIDOR_B);

function route(overrides: Partial<GoogleComputeRoute>): GoogleComputeRoute {
  return {
    duration: "1800s",
    distanceMeters: 10000,
    polyline: { encodedPolyline: corridorA },
    ...overrides,
  };
}

describe("tollFromGoogleRoute", () => {
  it("treats missing tollInfo as no toll expected", () => {
    expect(tollFromGoogleRoute(route({}))).toEqual({
      status: "none",
      cents: 0,
      currency: "AUD",
    });
  });

  it("treats tollInfo without estimatedPrice as unknown", () => {
    expect(
      tollFromGoogleRoute(route({ travelAdvisory: { tollInfo: {} } })),
    ).toEqual({ status: "unknown", cents: null, currency: null });
  });

  it("converts an AUD estimatedPrice to integer cents", () => {
    expect(
      tollFromGoogleRoute(
        route({
          travelAdvisory: {
            tollInfo: {
              estimatedPrice: [
                { currencyCode: "AUD", units: "5", nanos: 500000000 },
              ],
            },
          },
        }),
      ),
    ).toEqual({ status: "estimated", cents: 550, currency: "AUD" });
  });

  it("treats a non-AUD currency as unavailable rather than comparing unlike currencies", () => {
    expect(
      tollFromGoogleRoute(
        route({
          travelAdvisory: {
            tollInfo: {
              estimatedPrice: [{ currencyCode: "USD", units: "5", nanos: 0 }],
            },
          },
        }),
      ),
    ).toEqual({ status: "unknown", cents: null, currency: null });
  });

});

describe("normalizeRoutes", () => {
  it("merges near-identical routes from the normal and avoid-tolls calls", () => {
    const normal: GoogleComputeRoutesResponse = {
      routes: [
        route({
          duration: "1500s",
          polyline: { encodedPolyline: corridorA },
          travelAdvisory: {
            tollInfo: {
              estimatedPrice: [{ currencyCode: "AUD", units: "3", nanos: 0 }],
            },
          },
        }),
      ],
    };
    const avoidTolls: GoogleComputeRoutesResponse = {
      routes: [route({ polyline: { encodedPolyline: corridorAJittered } })],
    };

    const result = normalizeRoutes(normal, avoidTolls);

    expect(result).toHaveLength(1);
    // Fuller record (known price) wins over the unknown/none avoid-tolls duplicate.
    expect(result[0].toll).toEqual({
      status: "estimated",
      cents: 300,
      currency: "AUD",
    });
    expect(result[0].durationSeconds).toBe(1500);
    expect(result[0].labels).toContain("Avoids tolls where possible");
  });

  it("keeps genuinely distinct routes separate", () => {
    const normal: GoogleComputeRoutesResponse = {
      routes: [route({ polyline: { encodedPolyline: corridorA } })],
    };
    const avoidTolls: GoogleComputeRoutesResponse = {
      routes: [route({ polyline: { encodedPolyline: corridorB } })],
    };

    const result = normalizeRoutes(normal, avoidTolls);

    expect(result).toHaveLength(2);
  });
});
