# Google Cloud key restrictions, quotas, and billing alerts (spec sections 7-8)

Requires your login to console.cloud.google.com — not something I can do from
here. Checklist to work through once, before any public/pilot access:

## 1. Restrict the browser key (`NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`)

1. Console → APIs & Services → Credentials → click the browser key.
2. Application restrictions → **Websites** → add your dev/staging/prod
   origins (e.g. `localhost:3001/*`, `your-app.vercel.app/*`).
3. API restrictions → **Restrict key** → select only: Maps JavaScript API,
   Places API (New).

## 2. Restrict the server key (`GOOGLE_MAPS_SERVER_API_KEY`)

1. Same page, click the server key.
2. Application restrictions → **None** (server-side, no HTTP referrer to
   check) — but keep it out of any client bundle (already true: only read via
   `process.env` in `lib/googleRoutes.ts` and `scripts/*.mjs`, never
   `NEXT_PUBLIC_*`).
3. API restrictions → **Restrict key** → select only: Routes API.

## 3. Set per-API daily quotas

Console → APIs & Services → select each API (Routes API, Places API, Maps
JavaScript API) → Quotas & System Limits → edit the daily request quota to a
number sized for the pilot (spec doesn't give a number — pick something an
order of magnitude above expected pilot traffic, e.g. a few hundred requests/
day for a small private pilot, and tighten later against real usage).

## 4. Billing alerts

Console → Billing → Budgets & alerts → Create budget → scope to the project →
set a monthly amount and alert thresholds (e.g. 50%/90%/100%). Per spec: **this
does not cap spend**, it only notifies — the quotas in step 3 are the actual
spend limiter.

## 5. Confirm before going live

- Make one real request per API from the deployed environment (not just
  localhost) to confirm the website restriction on the browser key doesn't
  block your actual domain.
- Re-check the Routes API billing SKU actually triggered by your exact
  request shape (`computeAlternativeRoutes` + `extraComputations: ["TOLLS"]`)
  against the live pricing calculator — spec section 8 flags toll requests as
  pricier than plain route requests, and this should be confirmed for the
  current pricing, not assumed from an earlier conversation.
