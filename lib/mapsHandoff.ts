import { pickWaypoints } from "./polyline";

// A place as selected in the UI: always has a human-readable label, plus
// whichever identifier we resolved it to.
export type HandoffLocation = {
  label: string;
  placeId?: string;
  lat?: number;
  lng?: number;
};

function locationText(location: HandoffLocation): string {
  if (location.label) return location.label;
  return `${location.lat},${location.lng}`;
}

const MAX_WAYPOINTS = 3;

// Waypoint-assisted handoff (spec section 6): biases Google Maps toward the
// corridor of the route the driver selected, since Maps URLs cannot accept
// our polyline or route token directly. This is a best-effort nudge, not a
// guarantee Google Maps follows the same route — fidelity is unverified
// until the 20-trip Sydney test in the release gate.
export function buildGoogleMapsUrl(
  origin: HandoffLocation,
  destination: HandoffLocation,
  selectedRouteEncodedPolyline?: string,
): string {
  const params = new URLSearchParams({
    api: "1",
    origin: locationText(origin),
    destination: locationText(destination),
    travelmode: "driving",
  });

  // origin_place_id/destination_place_id must be paired with their text location (see Google Maps URLs docs).
  if (origin.placeId) params.set("origin_place_id", origin.placeId);
  if (destination.placeId) params.set("destination_place_id", destination.placeId);

  if (selectedRouteEncodedPolyline) {
    const waypoints = pickWaypoints(selectedRouteEncodedPolyline, MAX_WAYPOINTS);
    if (waypoints.length > 0) {
      params.set("waypoints", waypoints.map((w) => `${w.lat},${w.lng}`).join("|"));
    }
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
