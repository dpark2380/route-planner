import type { GoogleComputeRoutesResponse } from "./normalizeRoutes";

const COMPUTE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const UPSTREAM_TIMEOUT_MS = 10_000;
const FIELD_MASK =
  "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo";

export class UpstreamTimeoutError extends Error {}
export class UpstreamError extends Error {}
export class QuotaExceededError extends Error {}

type PlaceRef = { placeId: string };

async function computeRoutes(
  origin: PlaceRef,
  destination: PlaceRef,
  avoidTolls: boolean,
  apiKey: string,
): Promise<GoogleComputeRoutesResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(COMPUTE_ROUTES_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        origin: { placeId: origin.placeId },
        destination: { placeId: destination.placeId },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: !avoidTolls,
        extraComputations: ["TOLLS"],
        routeModifiers: {
          avoidTolls,
          tollPasses: ["AU_ETOLL_TAG"],
        },
      }),
    });

    if (response.status === 429) {
      throw new QuotaExceededError("computeRoutes quota exceeded");
    }
    if (!response.ok) {
      throw new UpstreamError(`computeRoutes responded ${response.status}`);
    }

    return (await response.json()) as GoogleComputeRoutesResponse;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new UpstreamTimeoutError("computeRoutes timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export type RouteSearchUpstreamResult = {
  normal: GoogleComputeRoutesResponse;
  avoidTolls: GoogleComputeRoutesResponse;
};

// Runs the normal and avoid-tolls requests concurrently so the user-facing
// worst case is one timeout window, not two serial ones.
export async function fetchRouteAlternatives(
  origin: PlaceRef,
  destination: PlaceRef,
  apiKey: string,
): Promise<RouteSearchUpstreamResult> {
  const [normal, avoidTolls] = await Promise.all([
    computeRoutes(origin, destination, false, apiKey),
    computeRoutes(origin, destination, true, apiKey),
  ]);

  return { normal, avoidTolls };
}
