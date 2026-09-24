// Generates Google Maps handoff URLs for the spec section 6 release gate
// ("test at least 20 diverse Sydney trips, record whether Maps opens,
// retains waypoints, and follows the selected corridor"). Reimplements
// pickWaypoints/buildGoogleMapsUrl inline (plain node script, no ts-node)
// rather than importing lib/*.ts.
// Run with: node --env-file=.env.local scripts/generate-handoff-test-urls.mjs

const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
if (!apiKey) {
  console.error("GOOGLE_MAPS_SERVER_API_KEY is not set in .env.local");
  process.exit(1);
}

const TRIPS = [
  { name: "M2 corridor", origin: "Norwest, NSW", destination: "Macquarie Park, NSW" },
  { name: "M7 corridor", origin: "Liverpool, NSW", destination: "Blacktown, NSW" },
  { name: "M5 South-West corridor", origin: "Campbelltown, NSW", destination: "Padstow, NSW" },
  { name: "Cross City Tunnel", origin: "Rushcutters Bay, NSW", destination: "Darling Harbour, Sydney NSW" },
  { name: "Sydney Harbour Bridge/Tunnel", origin: "North Sydney, NSW", destination: "Sydney Opera House, NSW" },
  { name: "WestConnex M4/M8", origin: "Parramatta, NSW", destination: "Sydney Airport, NSW" },
  { name: "Eastern Distributor", origin: "Sydney Airport, NSW", destination: "Kings Cross, NSW" },
  { name: "Lane Cove Tunnel", origin: "Macquarie Park, NSW", destination: "Chatswood, NSW" },
  { name: "No-toll short trip", origin: "Bondi Beach, NSW", destination: "Coogee Beach, NSW" },
  { name: "No-toll long trip", origin: "Parramatta, NSW", destination: "Penrith, NSW" },
];

function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  const decodeSignedValue = () => {
    let result = 0, shift = 0, byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (index < encoded.length) {
    lat += decodeSignedValue();
    lng += decodeSignedValue();
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function resamplePolyline(points, intervalMeters) {
  if (points.length < 2) return points;
  const resampled = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const segmentLength = haversineMeters(prev, curr);
    if (segmentLength === 0) continue;
    let distanceIntoSegment = intervalMeters - carry;
    while (distanceIntoSegment < segmentLength) {
      const t = distanceIntoSegment / segmentLength;
      resampled.push({
        lat: prev.lat + (curr.lat - prev.lat) * t,
        lng: prev.lng + (curr.lng - prev.lng) * t,
      });
      distanceIntoSegment += intervalMeters;
    }
    carry = distanceIntoSegment - segmentLength;
  }
  resampled.push(points[points.length - 1]);
  return resampled;
}

function pickWaypoints(encoded, count) {
  if (count <= 0) return [];
  const points = decodePolyline(encoded);
  if (points.length < 3) return [];
  const trimmed = resamplePolyline(points, 300).slice(1, -1);
  if (trimmed.length === 0) return [];
  const waypoints = [];
  for (let i = 1; i <= count; i++) {
    const index = Math.floor((i * trimmed.length) / (count + 1));
    waypoints.push(trimmed[Math.min(index, trimmed.length - 1)]);
  }
  return waypoints;
}

function buildGoogleMapsUrl(originText, destinationText, encodedPolyline) {
  const params = new URLSearchParams({
    api: "1",
    origin: originText,
    destination: destinationText,
    travelmode: "driving",
  });
  if (encodedPolyline) {
    const waypoints = pickWaypoints(encodedPolyline, 3);
    if (waypoints.length > 0) {
      params.set("waypoints", waypoints.map((w) => `${w.lat},${w.lng}`).join("|"));
    }
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

async function computeRoute(origin, destination) {
  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify({
        origin: { address: origin },
        destination: { address: destination },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
      }),
    },
  );
  if (!response.ok) throw new Error(`Google ${response.status}: ${await response.text()}`);
  const routes = (await response.json()).routes ?? [];
  return routes[0] ?? null;
}

for (const trip of TRIPS) {
  let route;
  try {
    route = await computeRoute(trip.origin, trip.destination);
  } catch (error) {
    console.log(`${trip.name}: Google request failed - ${error.message}`);
    continue;
  }
  if (!route) {
    console.log(`${trip.name}: no route returned`);
    continue;
  }

  const url = buildGoogleMapsUrl(trip.origin, trip.destination, route.polyline.encodedPolyline);
  console.log(`\n=== ${trip.name}: ${trip.origin} -> ${trip.destination} ===`);
  console.log(`  our route: ${(route.distanceMeters / 1000).toFixed(1)}km, ${Math.round(parseInt(route.duration) / 60)}min`);
  console.log(`  ${url}`);
}
