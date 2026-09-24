import { describe, expect, it } from "vitest";
import { prependTrip, type RecentTrip } from "./useRecentTrips";

function makeTrip(searchedAt: string): RecentTrip {
  return {
    originLabel: "A",
    originPlaceId: "a",
    destinationLabel: "B",
    destinationPlaceId: "b",
    tollCents: 100,
    distanceMeters: 1000,
    durationSeconds: 60,
    searchedAt,
  };
}

describe("prependTrip", () => {
  it("puts the newest trip first", () => {
    const trips = [makeTrip("2026-01-01")];
    const result = prependTrip(trips, makeTrip("2026-01-02"));
    expect(result.map((t) => t.searchedAt)).toEqual(["2026-01-02", "2026-01-01"]);
  });

  it("caps the list at the max length", () => {
    const trips = Array.from({ length: 10 }, (_, i) => makeTrip(`day-${i}`));
    const result = prependTrip(trips, makeTrip("newest"), 10);
    expect(result).toHaveLength(10);
    expect(result[0].searchedAt).toBe("newest");
    expect(result.at(-1)?.searchedAt).toBe("day-8");
  });
});
