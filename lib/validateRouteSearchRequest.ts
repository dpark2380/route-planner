import type { RouteSearchRequest } from "@/types/route";

export type ValidationResult =
  | { valid: true; request: RouteSearchRequest }
  | { valid: false; message: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

// Requires both places to resolve to place IDs and rejects identical endpoints (spec section 4).
export function validateRouteSearchRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { valid: false, message: "Request body must be an object." };
  }

  const { origin, destination } = body as Record<string, unknown>;
  const originPlaceId = (origin as Record<string, unknown> | undefined)?.placeId;
  const destinationPlaceId = (destination as Record<string, unknown> | undefined)
    ?.placeId;

  if (!isNonEmptyString(originPlaceId)) {
    return { valid: false, message: "origin.placeId is required." };
  }
  if (!isNonEmptyString(destinationPlaceId)) {
    return { valid: false, message: "destination.placeId is required." };
  }
  if (originPlaceId === destinationPlaceId) {
    return { valid: false, message: "Origin and destination must differ." };
  }

  return {
    valid: true,
    request: {
      origin: { placeId: originPlaceId },
      destination: { placeId: destinationPlaceId },
    },
  };
}
