// Manual validation: compares Google's tollInfo.estimatedPrice against
// TfNSW's official Toll Calculator Match API across several Sydney trips,
// each chosen to isolate a specific known tollway (spec section 1, build
// order step 1 - "validate its price behaviour in Sydney").
// Run with: node --env-file=.env.local scripts/spot-check-tolls.mjs

const googleApiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
const tfnswApiKey = process.env.TFNSW_TOLL_API_KEY;
if (!googleApiKey) {
  console.error("GOOGLE_MAPS_SERVER_API_KEY is not set in .env.local");
  process.exit(1);
}
if (!tfnswApiKey) {
  console.error("TFNSW_TOLL_API_KEY is not set in .env.local");
  process.exit(1);
}

// One real trip per tollway, chosen so the expected toll is unambiguous.
const TRIPS = [
  { name: "M2 (Hills Motorway)", origin: "Norwest, NSW", destination: "Macquarie Park, NSW" },
  { name: "M7 (Westlink)", origin: "Liverpool, NSW", destination: "Blacktown, NSW" },
  { name: "M5 South-West Motorway", origin: "Campbelltown, NSW", destination: "Padstow, NSW" },
  { name: "Lane Cove Tunnel", origin: "Epping, NSW", destination: "Chatswood, NSW" },
  { name: "Cross City Tunnel", origin: "Rushcutters Bay, NSW", destination: "Darling Harbour, Sydney NSW" },
  { name: "Sydney Harbour Bridge/Tunnel", origin: "North Sydney, NSW", destination: "Sydney Opera House, NSW" },
  { name: "No-toll control", origin: "Bondi Beach, NSW", destination: "Coogee Beach, NSW" },
];

async function computeRoutes(origin, destination) {
  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo",
      },
      body: JSON.stringify({
        origin: { address: origin },
        destination: { address: destination },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        extraComputations: ["TOLLS"],
        routeModifiers: { avoidTolls: false, tollPasses: ["AU_ETOLL_TAG"] },
      }),
    },
  );
  if (!response.ok) throw new Error(`Google ${response.status}: ${await response.text()}`);
  return (await response.json()).routes ?? [];
}

function googleTollCents(route) {
  const price = route.travelAdvisory?.tollInfo?.estimatedPrice?.[0];
  if (!price) return route.travelAdvisory?.tollInfo ? "unknown" : "none (no tollInfo)";
  return Number(price.units ?? 0) * 100 + Math.round((price.nanos ?? 0) / 1e7);
}

// The TfNSW gateway has been flaky under repeated calls in manual testing
// (intermittent 504s that succeed on retry) - not something we can fix
// client-side, so this diagnostic script just retries past it.
async function matchToll(encodedPolyline, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const response = await fetch(
      "https://api.transport.nsw.gov.au/v2/roads/toll_calc/match",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `apikey ${tfnswApiKey}`,
        },
        body: JSON.stringify({ polyline: encodedPolyline }),
      },
    );

    if (response.ok) return (await response.json()).match;

    const error = `${response.status}`;
    if (attempt === attempts) return { error };
    await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
  }
}

for (const trip of TRIPS) {
  console.log(`\n=== ${trip.name}: ${trip.origin} -> ${trip.destination} ===`);
  let routes;
  try {
    routes = await computeRoutes(trip.origin, trip.destination);
  } catch (error) {
    console.log("  Google request failed:", error.message);
    continue;
  }
  if (routes.length === 0) {
    console.log("  No route returned.");
    continue;
  }

  const route = routes[0];
  const google = googleTollCents(route);
  const tfnsw = await matchToll(route.polyline.encodedPolyline);

  console.log(`  distance=${route.distanceMeters}m duration=${route.duration}`);
  console.log("  Google tollInfo cents:", google);
  if (tfnsw?.error) {
    console.log("  TfNSW match error:", tfnsw.error);
  } else {
    console.log(
      `  TfNSW match cents: min=${tfnsw.minChargeInCents} max=${tfnsw.maxChargeInCents} confidence=${tfnsw.confidence}`,
    );
    console.log("  TfNSW summary:", tfnsw.summary);
    console.log("  TfNSW tollsCharged:", JSON.stringify(tfnsw.tollsCharged));
  }
}
