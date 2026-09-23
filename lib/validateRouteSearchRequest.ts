import type { PlaceRef, RouteSearchRequest } from "@/types/route";

export type ValidationResult =
  | { valid: true; request: RouteSearchRequest }
  | { valid: false; message: string };

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// Accepts either a place ID or valid coordinates (spec section 4).
function parsePlaceRef(value: unknown, label: string): PlaceRef | { message: string } {
  if (typeof value !== "object" || value === null) {
    return { message: `${label} is required.` };
  }
  const obj = value as Record<string, unknown>;

  if (isNonEmptyString(obj.placeId)) {
    return { placeId: obj.placeId };
  }
  if (isFiniteNumber(obj.lat) && isFiniteNumber(obj.lng)) {
    if (obj.lat < -90 || obj.lat > 90 || obj.lng < -180 || obj.lng > 180) {
      return { message: `${label} coordinates are out of range.` };
    }
    return { lat: obj.lat, lng: obj.lng };
  }

  return { message: `${label} must have a placeId or valid lat/lng.` };
}

function isSamePlaceRef(a: PlaceRef, b: PlaceRef): boolean {
  if ("placeId" in a && "placeId" in b) return a.placeId === b.placeId;
  if ("lat" in a && "lat" in b) return a.lat === b.lat && a.lng === b.lng;
  return false;
}

export function validateRouteSearchRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { valid: false, message: "Request body must be an object." };
  }

  const { origin, destination } = body as Record<string, unknown>;

  const originRef = parsePlaceRef(origin, "origin");
  if ("message" in originRef) return { valid: false, message: originRef.message };

  const destinationRef = parsePlaceRef(destination, "destination");
  if ("message" in destinationRef) {
    return { valid: false, message: destinationRef.message };
  }

  if (isSamePlaceRef(originRef, destinationRef)) {
    return { valid: false, message: "Origin and destination must differ." };
  }

  return { valid: true, request: { origin: originRef, destination: destinationRef } };
}
