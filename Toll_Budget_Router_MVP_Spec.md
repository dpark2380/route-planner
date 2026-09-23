# Toll Budget Router — MVP specification

**Status:** Draft for implementation  
**Date:** 23 September 2026  
**Initial market:** Everyday passenger-car drivers in Sydney, Australia

## 1. Product goal

Help a driver choose the **fastest available route within the amount they are willing to spend on tolls**. Show the trade-off in plain terms, including an occasional option just over budget when a small extra payment saves substantial time.

Example: “Within your $7 budget: 48 min, $5.50 estimated tolls. Spend $2.70 more to save 9 min.” Values are illustrations, not promises about any trip.

The product compares candidate routes using current traffic-aware travel times and estimated tolls. It does **not** calculate every theoretically possible route or guarantee a fixed toll charge or arrival time.

## 2. Who and what the MVP covers

| Decision | MVP choice |
| --- | --- |
| Audience | Sydney drivers planning a trip now |
| Platform | Responsive web app, useful on a phone |
| Vehicle | Standard non-commercial passenger car; show the assumed Sydney toll pass in the UI |
| Trip | One origin and one destination, driving only, departure now |
| Accounts | None |
| Navigation | Open directions in Google Maps after the driver reviews a route |
| Main ranking | Fastest eligible candidate with an estimated toll at or below the selected budget |
| Additional insight | Optional, clearly labeled route above budget with worthwhile time savings |

Saved Home/Work locations, accounts, other vehicle types and scheduled departures are later features.

## 3. User journey

1. Driver enters an origin and destination using place autocomplete; “current location” is optional with browser permission.
2. Driver taps **Compare routes**. Show a loading state while the server requests routes.
3. App shows routes on a Google map and as cards with ETA, estimated toll, and difference from the fastest and toll-free candidates when available.
4. Driver drags a toll-budget slider **after** seeing the results. The highlighted recommendation updates immediately from the already-fetched routes; moving the slider makes no network request.
5. App shows a separate **Worth considering** card only if a slightly more expensive route meets the best-value rule below. Going over budget always requires the driver to choose that route explicitly.
6. Driver selects a card and taps **Open in Google Maps**. The app explains that Google Maps will recalculate directions and the driver should check the route and tolls there before driving.

If no route has a reliable price at or under budget, explain why. Offer the cheapest *known-price* route and any toll-avoidance candidate for inspection without mislabeling either as within budget.

## 4. Functional requirements

### Trip inputs and results

- Require both places to resolve to place IDs or valid coordinates; reject identical endpoints and invalid inputs.
- Request a traffic-aware primary route plus available alternatives, and separately request a route with `avoidTolls: true`. Google offers at most three alternatives in addition to the primary route; it may return fewer. `avoidTolls` is a preference, not a guarantee of zero tolls.
- Request toll estimation for **both** calls, with one configured Sydney toll-pass assumption (`AU_ETOLL_TAG` initially; validate its price behaviour in Sydney). Keep the configuration and assumptions visible.
- Display duration rounded to minutes, distance, estimated toll in AUD, and a map line for each distinct route.
- Distinguish **$0 confirmed by response**, **priced toll route**, and **toll present but price unavailable**. Never convert an unknown toll into $0.
- Label a toll-free route only when the response indicates no tolls; if an avoidance route still has tolls, label it “Avoids tolls where possible.”
- Include a visible “Estimates may change with traffic, route recalculation and toll rules” note near results.

### Route selection

- Slider starts at $0 and extends to at least the highest known route toll, rounded up to a convenient dollar step. Provide a number input or keyboard-accessible equivalent for exact budgets.
- Recommend the fastest candidate whose **known** toll cost is within budget. Break equal-duration ties by lower toll, then shorter distance.
- Show a fastest route, the within-budget recommendation, a toll-free route if one exists, and other useful distinct options. One route may have several labels; render one card rather than duplicates.
- Remove a route from *recommended trade-off choices* if another known-price route is both no slower and no more expensive, with at least one strict improvement. Keep the fastest and any genuinely toll-free route visible if helpful for context. Unknown-price routes stay separate from the price frontier.
- Recompute labels and recommendations in memory as the slider changes. Only fetch again when origin/destination changes or the driver explicitly refreshes.
- Show when the results were calculated and provide **Refresh routes** to retrieve updated traffic.

### Best-value suggestion: initial rule, to tune with real trips

1. Let `base` be the fastest known-price route within budget.
2. Consider known-price candidates **above the budget** that cost no more than **A$5 extra relative to the budget**, save **at least 5 minutes relative to `base`**, and save **at least 2 minutes per additional A$1 relative to `base`**.
3. Of these, suggest the one with the greatest minutes saved per additional dollar compared with `base`; break ties by greater minutes saved, then lower toll. The UI states both the amount **over budget** and the extra cost **compared with `base`** so the numbers cannot be confused.
4. If no candidate qualifies, show no suggestion. Never automatically select an over-budget route.

These are product heuristics, not evidence of what any individual considers good value. Make thresholds constants so they can be tested and tuned.

## 5. Data and algorithm

### Normalised route type

```ts
type Toll =
  | { status: 'none'; cents: 0; currency: 'AUD' }
  | { status: 'estimated'; cents: number; currency: 'AUD' }
  | { status: 'unknown'; cents: null; currency: null };

type RouteOption = {
  id: string;                       // local ID; never treat API indices as stable
  durationSeconds: number;
  distanceMeters: number;
  toll: Toll;
  encodedPolyline: string;
  source: 'normal' | 'avoid_tolls';
  labels: string[];
};

type RouteSearchResult = {
  routes: RouteOption[];
  calculatedAt: string;             // ISO UTC timestamp
  passAssumption: 'AU_ETOLL_TAG';
  notices: string[];
};
```

Use integer cents for comparisons. Convert Google's money `units` and `nanos` carefully, check currency is AUD, and avoid floating-point budget comparisons. For the initial pass, if Google returns a toll currency other than AUD, treat the price as unavailable rather than comparing unlike currencies. Missing `tollInfo` after requesting `TOLLS` means no toll expected; `tollInfo` without `estimatedPrice` means unknown price.

### Candidate pipeline

1. Make normal and avoid-tolls requests with the same endpoints, departure time, travel mode, traffic setting and pass assumption.
2. Normalise the responses; identify exact or near-identical routes using decoded polyline overlap and endpoint checks, with duration/distance as supporting evidence. Do not deduplicate on ETA or toll amount alone.
3. Merge duplicate source labels and retain the fuller data record.
4. Separate unknown-price routes, compute the known-price time/toll frontier, and select the fastest affordable candidate for the current slider value.
5. Calculate best-value suggestion against that candidate. Return all useful candidates to the UI; calculate budget-dependent selections client-side.

This is **optimisation over routes supplied by Google**, not a claim to find the global fastest route subject to an arbitrary budget. If the API omits a useful intermediate route, the app cannot select it.

## 6. Google Maps handoff: feasibility gate

Google Maps URLs accept origin, destination, driving mode and a limited number of intermediate waypoints. They **do not accept our complete selected polyline or the Routes API route token**; the latter is intended for Google's Navigation SDK. Google Maps can recalculate after opening. Mobile-browser URLs support up to three waypoints and other platforms up to nine, and waypoint support varies by Maps product. Thus an exact handoff cannot be promised by this web MVP.

Implementation experiment:

1. Generate a Google Maps Directions URL with origin/destination place IDs where available and up to **three** carefully chosen, safe intermediate waypoints on the selected corridor. Do not insert points that require unsafe turns, private roads, or a detour to a road segment's inaccessible coordinate.
2. Open and inspect the resulting directions on iOS, Android and desktop for representative Sydney trips. Compare corridor, toll estimate and ETA with the app's selected route.
3. If a reliable waypoint set cannot be made for a route, hand off origin/destination only and say clearly: **“Google Maps may choose a different route. Check the route and tolls before you start.”** Never claim that a matching route was transferred.
4. Keep route handoff behind a small adapter so a later mobile app could use Navigation SDK if warranted.

**Release gate:** Test at least 20 diverse Sydney origin/destination and budget selections, including no-toll, mixed-toll, and intersecting toll roads. Record whether Google Maps opens, whether waypoints are retained, and whether its route follows the selected corridor. If fidelity is poor, release the comparison feature with the explicit nonmatching handoff described above; do not present it as guaranteed navigation of the chosen route.

## 7. Technical architecture

| Layer | Choice | Responsibility |
| --- | --- | --- |
| App | Next.js, React, TypeScript | Responsive UI and server API in one codebase |
| Styling | Tailwind CSS | Layout, states and mobile controls |
| Map | Google Maps JavaScript API | Display base map and route polylines |
| Places | Google Places autocomplete | Resolve origin/destination and place IDs |
| Routing | Google Routes API `computeRoutes` | Alternatives, traffic-aware ETAs, geometry and estimated tolls |
| Server | Next.js Route Handler | Validate requests, call Routes API, normalise results, keep routing key server-side |
| Persistence | None | Routes held in browser state for the current session |
| Deployment | Vercel or equivalent | Host web app and its server endpoint |

Browser key: restrict by website referrer and enable only needed browser APIs. Server key: restrict by API and keep in server environment variables; do not expose it to client code. Add basic request validation and throttling to the public endpoint. Browser API key visibility is expected; restrictions are essential.

### Endpoint

`POST /api/routes`

Request:

```json
{
  "origin": { "placeId": "..." },
  "destination": { "placeId": "..." }
}
```

Response: `RouteSearchResult` plus a structured error code when no route, upstream timeout, invalid input or quota exhaustion occurs. Do not accept arbitrary extra Google options from the browser in V1. Use the same server timestamp/departure for both upstream calls.

### Upstream request outline

```json
{
  "origin": { "placeId": "ORIGIN_PLACE_ID" },
  "destination": { "placeId": "DESTINATION_PLACE_ID" },
  "travelMode": "DRIVE",
  "routingPreference": "TRAFFIC_AWARE",
  "computeAlternativeRoutes": true,
  "extraComputations": ["TOLLS"],
  "routeModifiers": {
    "avoidTolls": false,
    "tollPasses": ["AU_ETOLL_TAG"]
  }
}
```

Send to `POST https://routes.googleapis.com/directions/v2:computeRoutes` with `X-Goog-Api-Key` and a narrow `X-Goog-FieldMask` covering route duration, distance, encoded polyline, and `travelAdvisory.tollInfo`. Second request sets `avoidTolls: true`; request alternatives there only if trials show they add useful distinct candidates and justify cost. Start with `TRAFFIC_AWARE`; compare `TRAFFIC_AWARE_OPTIMAL` on sample trips if ETA/route quality requires it. Verify exact supported fields and billing SKU during implementation.

### Suggested project layout

```text
app/
  page.tsx
  api/routes/route.ts
components/
  LocationSearch.tsx
  RouteMap.tsx
  RouteCards.tsx
  TollBudgetControl.tsx
lib/
  googleRoutes.ts
  normalizeRoutes.ts
  selectRoutes.ts
  mapsHandoff.ts
types/
  route.ts
```

## 8. Cost and operating constraints

Google Maps Platform requires a billing-enabled project. Routes, toll calculations, map loads and Places may produce **separate billable usage**; toll requests are more expensive than basic route requests. Do not assume development is free or hard-code a monthly free allowance from an earlier conversation. Check the live pricing calculator and the actual SKU triggered by this exact request before enabling public access.

- Make no Routes request on slider movement; one search currently uses two `computeRoutes` calls.
- Restrict keys, set per-API daily quotas, monitor usage, and set billing alerts. **Billing alerts are not a hard spending cap**; quotas help constrain usage.
- Avoid automatic frequent polling and broad route caching: traffic changes, and Google Maps Platform policies may restrict storage or reuse of returned content. Review relevant terms before adding caching or retaining trip history.
- Log only minimal operational metadata; avoid keeping users' precise origin/destination on the server in V1.

## 9. Error and edge-case behaviour

| Condition | Behaviour |
| --- | --- |
| Only one route supplied | Show it; state that no useful alternatives were found |
| No toll-free candidate | Do not show a “No tolls” card; still allow a $0 budget and explain no priced candidate qualifies |
| `avoidTolls` still returns a toll road | Show the actual estimated cost or unknown price; label as toll avoidance only |
| Toll exists but estimate missing | Mark “Toll cost unavailable”; exclude from within-budget and best-value claims |
| Network failure or quota exhaustion | Explain the search could not complete and offer Retry |
| No location permission | Let driver type an origin |
| Route/traffic changes after comparison | Show calculation time and Refresh; warn on Maps handoff |
| Route is very long or crosses currency regions | MVP is Sydney only; reject or mark unsupported rather than mixing currencies |

## 10. Acceptance criteria and validation

- A user can search a Sydney driving trip, see a map and route cards with traffic-aware ETAs and honest toll states, and use the slider without extra route API requests.
- For any displayed set of *known-price* routes, the recommended route is the fastest within the chosen budget, with deterministic tie-breaking. No route with unknown toll price is represented as affordable.
- Best-value suggestion appears only when the stated thresholds pass and never silently replaces the within-budget selection.
- The “No tolls” label is used only when toll information supports it.
- The Google Maps button works on supported test devices and communicates handoff uncertainty; fidelity test results are recorded before launch.
- At least 20 representative Sydney trips are manually reviewed for useful candidate spread, toll estimate plausibility against actual directions/toll information, absence of misleading labels, and handoff behaviour. Findings determine whether the MVP is useful enough for public testing.

Automated tests should focus on the route-selection and toll-state logic, especially equal-duration ties, missing toll estimates, exact budget boundaries, dominated routes and above-budget suggestions. Use a small set of saved synthetic API responses; do not rely on live paid API calls in unit tests.

## 11. Build order

1. Enable and restrict Google Maps, Places and Routes APIs; test one Sydney trip and record actual response and billing tier.
2. Implement the server endpoint, normalisation, unknown-toll handling and selection tests.
3. Build place inputs, map, route cards and loading/error states.
4. Add budget slider and best-value explanation; confirm slider makes no request.
5. Prototype Maps URL handoff, run the Sydney trip test set, adjust labels and decide whether to ship waypoint-assisted handoff.
6. Deploy a small private pilot, monitor API usage and collect feedback on route usefulness and trust in toll estimates.

## 12. Later iterations

- Saved trips, Home/Work and accounts after users demonstrate repeat usage.
- Vehicle category and toll-pass selection, departure times and more regions.
- Better candidate discovery only if the initial routes repeatedly miss useful intermediate toll/time trade-offs; evaluate additional route queries and their cost before building any pathfinding system.
- Dedicated mobile navigation only if route fidelity in Google Maps is a major blocker.

## Sources checked for implementation assumptions

- Google Routes API: [alternative routes](https://developers.google.com/maps/documentation/routes/alternative-routes), [toll estimates](https://developers.google.com/maps/documentation/routes/calculate_toll_fees), [traffic options](https://developers.google.com/maps/documentation/routes/traffic-opt), [billing](https://developers.google.com/maps/documentation/routes/usage-and-billing), and [toll response semantics](https://developers.google.com/maps/documentation/routes/reference/rest/v2/RouteTravelAdvisory).
- Google Maps Platform: [Maps URLs and waypoint limits](https://developers.google.com/maps/documentation/urls/get-started), [route token purpose](https://developers.google.com/maps/documentation/routes/route_token), and [Maps JavaScript billing](https://developers.google.com/maps/documentation/javascript/usage-and-billing).

External API behaviour, prices, quotas and terms should be rechecked at implementation time.
