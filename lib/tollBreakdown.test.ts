import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTollBreakdown } from "./tollBreakdown";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchTollBreakdown", () => {
  it("returns gantry charges for the light vehicle class", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          match: {
            confidence: 0.98,
            tollsCharged: [
              {
                chargeType: "Fixed",
                charges: [
                  { vehicleClass: "A", chargeInCents: 1064 },
                  { vehicleClass: "B", chargeInCents: 3191 },
                ],
                gantryVisits: [
                  {
                    gantry: {
                      motorwayName: "Hills M2",
                      chargeType: "Fixed",
                      latitude: -33.7672,
                      longitude: 151.114,
                    },
                  },
                ],
              },
            ],
          },
        }),
      ),
    );

    const result = await fetchTollBreakdown("encoded", "key");
    expect(result).toEqual({
      status: "ok",
      confidence: 0.98,
      gantries: [
        { motorwayName: "Hills M2", chargeType: "Fixed", cents: 1064, lat: -33.7672, lng: 151.114 },
      ],
    });
  });

  it("treats low confidence as unavailable rather than trusting a poor match", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          match: { confidence: 0.4, tollsCharged: [] },
        }),
      ),
    );

    const result = await fetchTollBreakdown("encoded", "key");
    expect(result.status).toBe("unavailable");
  });

  it("retries on failure and returns unavailable after exhausting attempts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 504 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchTollBreakdown("encoded", "key");
    expect(result.status).toBe("unavailable");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
