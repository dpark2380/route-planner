export type Toll =
  | { status: "none"; cents: 0; currency: "AUD" }
  | { status: "estimated"; cents: number; currency: "AUD" }
  | { status: "unknown"; cents: null; currency: null };

export type RouteSource = "normal" | "avoid_tolls";

export type RouteOption = {
  id: string; // local ID; never treat API indices as stable
  durationSeconds: number;
  distanceMeters: number;
  toll: Toll;
  encodedPolyline: string;
  source: RouteSource;
  labels: string[];
};

export type RouteSearchResult = {
  routes: RouteOption[];
  calculatedAt: string; // ISO UTC timestamp
  passAssumption: "AU_ETOLL_TAG";
  notices: string[];
};

export type RouteErrorCode =
  | "INVALID_INPUT"
  | "NO_ROUTE_FOUND"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_ERROR"
  | "QUOTA_EXCEEDED";

export type RouteSearchError = {
  code: RouteErrorCode;
  message: string;
};

export type PlaceRef = { placeId: string } | { lat: number; lng: number };

export type RouteSearchRequest = {
  origin: PlaceRef;
  destination: PlaceRef;
};
