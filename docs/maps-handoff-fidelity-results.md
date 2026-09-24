# Google Maps handoff fidelity test (spec section 6 release gate)

Desktop web only (`google.com/maps/dir`), tested 2026-09-23. iOS and Android are
not tested here — no physical devices/simulators available in this environment.
Spec requires 20+ trips across all three platforms before shipping the
comparison feature as anything more than "may not match, check before driving."
This covers 10 of the 20+ trips, desktop-only: **run the remaining trips, and
the iOS/Android passes, on real devices before treating the handoff as validated.**

Method: for each trip, called `computeRoutes` for the app's own route, derived
3 waypoints from its polyline (`pickWaypoints`), built the handoff URL
(`buildGoogleMapsUrl`), opened it in Chrome, and compared Maps' resulting
route/distance/duration/toll-flag against our own route data.

| Trip | Our route | Maps result | Waypoints retained | Corridor match | Toll flag correct |
|---|---|---|---|---|---|
| M2 (Norwest→Macquarie Park) | 19.3km/21min | 19.3km/21min via M2 Motorway | yes, resolved to real addresses on Barclay Rd/M2 | yes | yes |
| M7 (Liverpool→Blacktown) | 34.3km/32min | 36.0km/32min via Hume Hwy/M7 | yes | yes | yes |
| M5 SW (Campbelltown→Padstow) | 31.9km/25min | 31.9km/25min via Campbelltown Rd/M31 | yes | yes | yes |
| Cross City Tunnel (Rushcutters Bay→Darling Harbour) | 3.7km/10min | 3.7km/9min via Roslyn Gardens/Bayswater Rd | yes, but clustered near origin (short trip) | yes | yes |
| Harbour Bridge (North Sydney→Opera House) | 4.6km/7min | 4.6km/7min via Cahill Expy, visibly crosses the bridge | yes | yes | yes |
| WestConnex M4 (Parramatta→Sydney Airport) | 26.7km/23min | 27.6km/39min via M4 (traffic) | yes | yes | yes |
| Eastern Distributor (Sydney Airport→Kings Cross) | 9.9km/18min | 9.9km/18min via Deborah Lawrie Flyover | yes | yes | yes |
| Lane Cove (Macquarie Park→Chatswood) | 6.7km/11min | 6.7km/10min via Waterloo Rd/Lane Cove Rd, no tolls | yes | yes | yes (correctly no toll — route doesn't use the tunnel) |
| No-toll short (Bondi→Coogee) | 4.9km/10min | 4.8km/10min, no tolls | yes | yes | yes |
| No-toll long (Parramatta→Penrith) | 35.4km/32min | 35.4km/32min via M4 (untolled section), no tolls | yes | yes | yes |

**Result: 10/10 pass.** Waypoints were retained and resolved to real streets in
every case; Maps' distance/duration tracked our own computed route closely
(within live-traffic variance); toll presence/absence matched our labels in
every case, including two cases (Lane Cove, M4 west of the WestConnex tunnels)
where the correct answer was "no toll" despite the road being tolled elsewhere.

Known limitation observed: on very short trips (~<4km, e.g. Cross City
Tunnel), the 300m end-margin trim in `pickWaypoints` leaves little room, so
waypoints cluster near the origin instead of spreading across the corridor.
Didn't cause a wrong route in this test, but worth revisiting if a future
short trip picks the wrong corridor.

## Still needed before this can be called a passing release gate

- 10+ more diverse trips (spec asks for 20+, including more mixed-toll and
  intersecting-toll-road cases)
- The same trips on iOS and Android (Maps app behavior/waypoint limits differ
  from desktop web per spec section 6)
