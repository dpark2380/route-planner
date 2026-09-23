import { describe, expect, it } from "vitest";
import {
  computeFrontier,
  isKnownPrice,
  selectBestValue,
  selectWithinBudget,
  type KnownPriceRoute,
} from "./selectRoutes";
import type { RouteOption } from "@/types/route";

function makeRoute(overrides: Partial<RouteOption>): RouteOption {
  return {
    id: "route-1",
    durationSeconds: 1800,
    distanceMeters: 10000,
    toll: { status: "estimated", cents: 300, currency: "AUD" },
    encodedPolyline: "",
    source: "normal",
    labels: [],
    ...overrides,
  };
}

describe("selectWithinBudget", () => {
  it("picks the fastest known-price route at or under budget", () => {
    const fast = makeRoute({ id: "fast", durationSeconds: 1200, toll: { status: "estimated", cents: 800, currency: "AUD" } });
    const slow = makeRoute({ id: "slow", durationSeconds: 1800, toll: { status: "estimated", cents: 200, currency: "AUD" } });

    expect(selectWithinBudget([fast, slow], 800)?.id).toBe("fast");
    expect(selectWithinBudget([fast, slow], 200)?.id).toBe("slow");
  });

  it("includes a route exactly at the budget boundary", () => {
    const atBudget = makeRoute({ id: "at-budget", toll: { status: "estimated", cents: 500, currency: "AUD" } });
    expect(selectWithinBudget([atBudget], 500)?.id).toBe("at-budget");
    expect(selectWithinBudget([atBudget], 499)).toBeNull();
  });

  it("breaks equal-duration ties by lower toll, then shorter distance", () => {
    const a = makeRoute({ id: "a", durationSeconds: 1800, distanceMeters: 9000, toll: { status: "estimated", cents: 300, currency: "AUD" } });
    const b = makeRoute({ id: "b", durationSeconds: 1800, distanceMeters: 5000, toll: { status: "estimated", cents: 200, currency: "AUD" } });
    const d = makeRoute({ id: "d", durationSeconds: 1800, distanceMeters: 3000, toll: { status: "estimated", cents: 200, currency: "AUD" } });

    // a vs b: equal duration, b has the lower toll, so b wins regardless of distance.
    expect(selectWithinBudget([a, b], 1000)?.id).toBe("b");
    // b vs d: equal duration and toll, so the shorter-distance route wins.
    expect(selectWithinBudget([b, d], 1000)?.id).toBe("d");
  });

  it("excludes unknown-price routes from within-budget selection", () => {
    const unknown = makeRoute({ id: "unknown", durationSeconds: 600, toll: { status: "unknown", cents: null, currency: null } });
    const known = makeRoute({ id: "known", durationSeconds: 1800, toll: { status: "estimated", cents: 300, currency: "AUD" } });

    expect(selectWithinBudget([unknown, known], 1000)?.id).toBe("known");
  });

  it("returns null when no known-price route is affordable", () => {
    const tooExpensive = makeRoute({ toll: { status: "estimated", cents: 1000, currency: "AUD" } });
    expect(selectWithinBudget([tooExpensive], 500)).toBeNull();
  });
});

describe("computeFrontier", () => {
  it("removes a route dominated by another that is no slower and no more expensive", () => {
    const dominant = { ...makeRoute({ id: "dominant", durationSeconds: 1200, toll: { status: "estimated", cents: 300, currency: "AUD" } }) } as KnownPriceRoute;
    const dominated = { ...makeRoute({ id: "dominated", durationSeconds: 1500, toll: { status: "estimated", cents: 400, currency: "AUD" } }) } as KnownPriceRoute;

    const frontier = computeFrontier([dominant, dominated]);

    expect(frontier.map((r) => r.id)).toEqual(["dominant"]);
  });

  it("keeps routes that trade off duration against toll", () => {
    const fasterMoreExpensive = { ...makeRoute({ id: "faster", durationSeconds: 1200, toll: { status: "estimated", cents: 800, currency: "AUD" } }) } as KnownPriceRoute;
    const slowerCheaper = { ...makeRoute({ id: "cheaper", durationSeconds: 1800, toll: { status: "estimated", cents: 200, currency: "AUD" } }) } as KnownPriceRoute;

    const frontier = computeFrontier([fasterMoreExpensive, slowerCheaper]);

    expect(frontier.map((r) => r.id).sort()).toEqual(["cheaper", "faster"]);
  });
});

describe("selectBestValue", () => {
  it("suggests an over-budget route that saves enough time per extra dollar", () => {
    const base = makeRoute({ id: "base", durationSeconds: 48 * 60, toll: { status: "estimated", cents: 550, currency: "AUD" } });
    const worthIt = makeRoute({ id: "worth-it", durationSeconds: 39 * 60, toll: { status: "estimated", cents: 820, currency: "AUD" } });

    const suggestion = selectBestValue([base, worthIt], 700);

    expect(suggestion?.route.id).toBe("worth-it");
    expect(suggestion?.extraOverBudgetCents).toBe(120);
    expect(suggestion?.extraOverBaseCents).toBe(270);
    expect(suggestion?.minutesSavedVsBase).toBe(9);
  });

  it("does not suggest a route that costs more than $5 over budget", () => {
    const base = makeRoute({ id: "base", durationSeconds: 1800, toll: { status: "estimated", cents: 500, currency: "AUD" } });
    const tooFarOverBudget = makeRoute({ id: "too-far", durationSeconds: 900, toll: { status: "estimated", cents: 1100, currency: "AUD" } });

    expect(selectBestValue([base, tooFarOverBudget], 500)).toBeNull();
  });

  it("does not suggest a route saving less than 5 minutes", () => {
    const base = makeRoute({ id: "base", durationSeconds: 1800, toll: { status: "estimated", cents: 500, currency: "AUD" } });
    const barelyFaster = makeRoute({ id: "barely-faster", durationSeconds: 1740, toll: { status: "estimated", cents: 600, currency: "AUD" } });

    expect(selectBestValue([base, barelyFaster], 500)).toBeNull();
  });

  it("does not suggest a route below the minutes-saved-per-dollar threshold", () => {
    const base = makeRoute({ id: "base", durationSeconds: 1800, toll: { status: "estimated", cents: 500, currency: "AUD" } });
    // Saves 6 minutes for $4 extra = 1.5 min/$1, below the 2 min/$1 threshold.
    const poorValue = makeRoute({ id: "poor-value", durationSeconds: 1440, toll: { status: "estimated", cents: 900, currency: "AUD" } });

    expect(selectBestValue([base, poorValue], 500)).toBeNull();
  });

  it("never returns a suggestion when nothing is within budget at all", () => {
    const tooExpensive = makeRoute({ toll: { status: "estimated", cents: 1000, currency: "AUD" } });
    expect(selectBestValue([tooExpensive], 500)).toBeNull();
  });

  it("ignores unknown-price routes as best-value candidates", () => {
    const base = makeRoute({ id: "base", durationSeconds: 1800, toll: { status: "estimated", cents: 500, currency: "AUD" } });
    const unknown = makeRoute({ id: "unknown", durationSeconds: 900, toll: { status: "unknown", cents: null, currency: null } });

    expect(selectBestValue([base, unknown], 500)).toBeNull();
  });
});

describe("isKnownPrice", () => {
  it("distinguishes known and unknown toll states", () => {
    expect(isKnownPrice(makeRoute({ toll: { status: "none", cents: 0, currency: "AUD" } }))).toBe(true);
    expect(isKnownPrice(makeRoute({ toll: { status: "unknown", cents: null, currency: null } }))).toBe(false);
  });
});
