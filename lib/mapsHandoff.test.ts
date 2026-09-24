import { describe, expect, it } from "vitest";
import { buildGoogleMapsUrl } from "./mapsHandoff";
import { CORRIDOR_A, encodePolylineForTest } from "./__fixtures__/testPolylines";

describe("buildGoogleMapsUrl", () => {
  it("pairs place IDs with their location text", () => {
    const url = buildGoogleMapsUrl(
      { label: "Sydney Opera House", placeId: "abc" },
      { label: "Sydney Airport", placeId: "xyz" },
    );
    const params = new URL(url).searchParams;

    expect(params.get("origin")).toBe("Sydney Opera House");
    expect(params.get("origin_place_id")).toBe("abc");
    expect(params.get("destination")).toBe("Sydney Airport");
    expect(params.get("destination_place_id")).toBe("xyz");
    expect(params.get("travelmode")).toBe("driving");
  });

  it("falls back to coordinates when there is no label", () => {
    const url = buildGoogleMapsUrl(
      { label: "", lat: -33.86, lng: 151.2 },
      { label: "Destination" },
    );
    const params = new URL(url).searchParams;

    expect(params.get("origin")).toBe("-33.86,151.2");
    expect(params.has("origin_place_id")).toBe(false);
  });

  it("adds waypoints along the selected route so Maps favours the same corridor", () => {
    const encoded = encodePolylineForTest(CORRIDOR_A);
    const url = buildGoogleMapsUrl(
      { label: "Sydney Opera House", placeId: "abc" },
      { label: "Sydney Airport", placeId: "xyz" },
      encoded,
    );
    const params = new URL(url).searchParams;

    expect(params.has("waypoints")).toBe(true);
    expect(params.get("waypoints")!.split("|").length).toBeGreaterThan(0);
  });

  it("omits waypoints when no route is selected", () => {
    const url = buildGoogleMapsUrl(
      { label: "Sydney Opera House", placeId: "abc" },
      { label: "Sydney Airport", placeId: "xyz" },
    );
    expect(new URL(url).searchParams.has("waypoints")).toBe(false);
  });
});
