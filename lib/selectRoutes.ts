import type { RouteOption } from "@/types/route";

// Best-value thresholds (spec section 4): product heuristics, tunable.
export const BEST_VALUE_MAX_EXTRA_OVER_BUDGET_CENTS = 500; // A$5
export const BEST_VALUE_MIN_MINUTES_SAVED = 5;
export const BEST_VALUE_MIN_MINUTES_SAVED_PER_DOLLAR = 2;

type KnownToll = { status: "none" | "estimated"; cents: number; currency: "AUD" };
export type KnownPriceRoute = RouteOption & { toll: KnownToll };

export function isKnownPrice(route: RouteOption): route is KnownPriceRoute {
  return route.toll.status !== "unknown";
}

export function knownPriceRoutes(routes: RouteOption[]): KnownPriceRoute[] {
  return routes.filter(isKnownPrice);
}

// Fastest first; ties by lower toll, then shorter distance.
function compareBySelectionOrder(a: KnownPriceRoute, b: KnownPriceRoute): number {
  if (a.durationSeconds !== b.durationSeconds) {
    return a.durationSeconds - b.durationSeconds;
  }
  if (a.toll.cents !== b.toll.cents) {
    return a.toll.cents - b.toll.cents;
  }
  return a.distanceMeters - b.distanceMeters;
}

// The fastest known-price route whose toll is at or below the budget.
export function selectWithinBudget(
  routes: RouteOption[],
  budgetCents: number,
): KnownPriceRoute | null {
  const affordable = knownPriceRoutes(routes).filter(
    (route) => route.toll.cents <= budgetCents,
  );
  if (affordable.length === 0) return null;
  return [...affordable].sort(compareBySelectionOrder)[0];
}

// A route is dominated when another known-price route is no slower and no
// more expensive, with at least one strict improvement.
export function computeFrontier(routes: KnownPriceRoute[]): KnownPriceRoute[] {
  return routes.filter((candidate) => {
    return !routes.some((other) => {
      if (other === candidate) return false;
      const noSlower = other.durationSeconds <= candidate.durationSeconds;
      const noMoreExpensive = other.toll.cents <= candidate.toll.cents;
      const strictlyBetter =
        other.durationSeconds < candidate.durationSeconds ||
        other.toll.cents < candidate.toll.cents;
      return noSlower && noMoreExpensive && strictlyBetter;
    });
  });
}

export type BestValueSuggestion = {
  route: KnownPriceRoute;
  extraOverBudgetCents: number;
  extraOverBaseCents: number;
  minutesSavedVsBase: number;
};

// See spec section 4, "Best-value suggestion." Never auto-selects an over-budget route.
export function selectBestValue(
  routes: RouteOption[],
  budgetCents: number,
): BestValueSuggestion | null {
  const base = selectWithinBudget(routes, budgetCents);
  if (!base) return null;

  const candidates = knownPriceRoutes(routes).filter(
    (route) => route.toll.cents > budgetCents,
  );

  let best: BestValueSuggestion | null = null;

  for (const route of candidates) {
    const extraOverBudgetCents = route.toll.cents - budgetCents;
    const extraOverBaseCents = route.toll.cents - base.toll.cents;
    const minutesSavedVsBase =
      (base.durationSeconds - route.durationSeconds) / 60;

    if (extraOverBudgetCents > BEST_VALUE_MAX_EXTRA_OVER_BUDGET_CENTS) continue;
    if (minutesSavedVsBase < BEST_VALUE_MIN_MINUTES_SAVED) continue;
    if (extraOverBaseCents <= 0) continue;

    const extraOverBaseDollars = extraOverBaseCents / 100;
    const minutesSavedPerDollar = minutesSavedVsBase / extraOverBaseDollars;
    if (minutesSavedPerDollar < BEST_VALUE_MIN_MINUTES_SAVED_PER_DOLLAR) continue;

    const candidate: BestValueSuggestion = {
      route,
      extraOverBudgetCents,
      extraOverBaseCents,
      minutesSavedVsBase,
    };

    if (!best) {
      best = candidate;
      continue;
    }

    const bestMinutesPerDollar =
      best.minutesSavedVsBase / (best.extraOverBaseCents / 100);
    if (minutesSavedPerDollar > bestMinutesPerDollar) {
      best = candidate;
    } else if (minutesSavedPerDollar === bestMinutesPerDollar) {
      if (candidate.minutesSavedVsBase > best.minutesSavedVsBase) {
        best = candidate;
      } else if (
        candidate.minutesSavedVsBase === best.minutesSavedVsBase &&
        candidate.route.toll.cents < best.route.toll.cents
      ) {
        best = candidate;
      }
    }
  }

  return best;
}
