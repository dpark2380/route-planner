import { describe, expect, it } from "vitest";
import { validateRouteSearchRequest } from "./validateRouteSearchRequest";

describe("validateRouteSearchRequest", () => {
  it("accepts a request with distinct place IDs", () => {
    const result = validateRouteSearchRequest({
      origin: { placeId: "A" },
      destination: { placeId: "B" },
    });
    expect(result.valid).toBe(true);
  });

  it("rejects identical origin and destination", () => {
    const result = validateRouteSearchRequest({
      origin: { placeId: "A" },
      destination: { placeId: "A" },
    });
    expect(result).toEqual({
      valid: false,
      message: "Origin and destination must differ.",
    });
  });

  it("rejects a missing origin place ID", () => {
    const result = validateRouteSearchRequest({
      destination: { placeId: "B" },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects a non-object body", () => {
    expect(validateRouteSearchRequest(null).valid).toBe(false);
    expect(validateRouteSearchRequest("not an object").valid).toBe(false);
  });
});
