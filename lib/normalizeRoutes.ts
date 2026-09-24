import { areRoutesEquivalent } from "./polyline";
import { moneyToAudCents, type GoogleMoney } from "./money";
import type { RouteOption, RouteSource, Toll } from "@/types/route";

// Shape of a single route from Google's computeRoutes response, restricted to
// the fields covered by our field mask (duration, distanceMeters, polyline, travelAdvisory.tollInfo).
export type GoogleComputeRoute = {
  duration: string; // e.g. "1234s"
  distanceMeters: number;
  polyline: { encodedPolyline: string };
  travelAdvisory?: {
    tollInfo?: {
      estimatedPrice?: GoogleMoney[];
    };
  };
};

export type GoogleComputeRoutesResponse = {
  routes?: GoogleComputeRoute[];
};

function parseDurationSeconds(duration: string): number {
  return parseInt(duration.replace("s", ""), 10);
}

// Missing tollInfo means no toll expected; tollInfo without estimatedPrice means unknown price.
export function tollFromGoogleRoute(route: GoogleComputeRoute): Toll {
  const tollInfo = route.travelAdvisory?.tollInfo;
  if (!tollInfo) {
    return { status: "none", cents: 0, currency: "AUD" };
  }

  const price = tollInfo.estimatedPrice?.[0];
  if (!price) {
    return { status: "unknown", cents: null, currency: null };
  }

  const cents = moneyToAudCents(price);
  if (cents === null) {
    // Non-AUD currency: treat as unavailable rather than comparing unlike currencies.
    return { status: "unknown", cents: null, currency: null };
  }

  if (cents === 0) {
    return { status: "none", cents: 0, currency: "AUD" };
  }

  return { status: "estimated", cents, currency: "AUD" };
}

let nextLocalId = 0;
function generateLocalId(): string {
  nextLocalId += 1;
  return `route-${nextLocalId}`;
}

function toRouteOption(
  route: GoogleComputeRoute,
  source: RouteSource,
): RouteOption {
  const labels =
    source === "avoid_tolls" ? ["Avoids tolls where possible"] : [];
  return {
    id: generateLocalId(),
    durationSeconds: parseDurationSeconds(route.duration),
    distanceMeters: route.distanceMeters,
    toll: tollFromGoogleRoute(route),
    encodedPolyline: route.polyline.encodedPolyline,
    source,
    labels,
  };
}

// Higher is more informative: an actual price beats a confirmed no-toll,
// which beats not knowing whether there's a toll at all.
const TOLL_INFORMATIVENESS: Record<RouteOption["toll"]["status"], number> = {
  estimated: 2,
  none: 1,
  unknown: 0,
};

// Merges routes that represent the same corridor (per areRoutesEquivalent),
// keeping the fuller data record and combining their labels.
function mergeDuplicates(routes: RouteOption[]): RouteOption[] {
  const merged: RouteOption[] = [];

  for (const route of routes) {
    const existingIndex = merged.findIndex((candidate) =>
      areRoutesEquivalent(candidate.encodedPolyline, route.encodedPolyline),
    );

    if (existingIndex === -1) {
      merged.push(route);
      continue;
    }

    const existing = merged[existingIndex];
    const fuller =
      TOLL_INFORMATIVENESS[route.toll.status] >
      TOLL_INFORMATIVENESS[existing.toll.status]
        ? route
        : existing;
    const other = fuller === route ? existing : route;
    merged[existingIndex] = {
      ...fuller,
      labels: Array.from(new Set([...fuller.labels, ...other.labels])),
    };
  }

  return merged;
}

export function normalizeRoutes(
  normalResponse: GoogleComputeRoutesResponse,
  avoidTollsResponse: GoogleComputeRoutesResponse,
): RouteOption[] {
  const normalRoutes = (normalResponse.routes ?? []).map((route) =>
    toRouteOption(route, "normal"),
  );
  const avoidTollsRoutes = (avoidTollsResponse.routes ?? []).map((route) =>
    toRouteOption(route, "avoid_tolls"),
  );

  return mergeDuplicates([...normalRoutes, ...avoidTollsRoutes]);
}
