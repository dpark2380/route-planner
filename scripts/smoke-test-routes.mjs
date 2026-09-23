// One-off manual smoke test for build-order step 1: confirms the server key
// works and records the real computeRoutes response shape for one Sydney trip.
// Run with: node --env-file=.env.local scripts/smoke-test-routes.mjs

const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
if (!apiKey) {
  console.error("GOOGLE_MAPS_SERVER_API_KEY is not set in .env.local");
  process.exit(1);
}

const body = {
  origin: { address: "Sydney Opera House, Sydney NSW" },
  destination: { address: "Sydney Airport (SYD), Mascot NSW" },
  travelMode: "DRIVE",
  routingPreference: "TRAFFIC_AWARE",
  computeAlternativeRoutes: true,
  extraComputations: ["TOLLS"],
  routeModifiers: {
    avoidTolls: false,
    tollPasses: ["AU_ETOLL_TAG"],
  },
};

const response = await fetch(
  "https://routes.googleapis.com/directions/v2:computeRoutes",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo",
    },
    body: JSON.stringify(body),
  },
);

console.log("Status:", response.status);
const json = await response.json();
console.log(JSON.stringify(json, null, 2));
