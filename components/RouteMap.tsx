"use client";

import { useEffect } from "react";
import { Map, Marker, useMap } from "@vis.gl/react-google-maps";
import type { RouteOption } from "@/types/route";
import { decodePolyline } from "@/lib/polyline";
import { RoutePolyline } from "./RoutePolyline";
import type { GantryCharge } from "@/lib/tollBreakdown";

const HIGHLIGHT_COLOR = "#22c55e";
const DIMMED_COLOR = "#52525b";
const SYDNEY_CENTER = { lat: -33.8688, lng: 151.2093 };

// A muted dark theme so the map matches the app's dark surfaces instead of
// Google's default light basemap.
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1c1e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1c1e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b9198" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2f32" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3f44" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#3a3f44" }] },
];

function FitBoundsToRoutes({ routes }: { routes: RouteOption[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || routes.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const route of routes) {
      for (const point of decodePolyline(route.encodedPolyline)) {
        bounds.extend(point);
      }
    }
    map.fitBounds(bounds, 48);
  }, [map, routes]);

  return null;
}

type Props = {
  routes: RouteOption[];
  highlightedRouteId: string | null;
  className?: string;
  gantries?: GantryCharge[];
};

// Rendered inside the page's single APIProvider (@vis.gl/react-google-maps
// only supports one script load per page).
export function RouteMap({ routes, highlightedRouteId, className, gantries }: Props) {
  return (
    <Map
      className={className ?? "h-72 w-full"}
      defaultCenter={SYDNEY_CENTER}
      defaultZoom={12}
      gestureHandling="greedy"
      disableDefaultUI
      styles={DARK_MAP_STYLE}
    >
      {routes.map((route) => (
        <RoutePolyline
          key={route.id}
          encodedPath={route.encodedPolyline}
          strokeColor={
            route.id === highlightedRouteId ? HIGHLIGHT_COLOR : DIMMED_COLOR
          }
          strokeWeight={route.id === highlightedRouteId ? 6 : 4}
          strokeOpacity={route.id === highlightedRouteId ? 0.9 : 0.6}
        />
      ))}
      {gantries
        ?.filter((gantry): gantry is GantryCharge & { lat: number; lng: number } =>
          gantry.lat !== null && gantry.lng !== null,
        )
        .map((gantry, index) => (
        <Marker
          key={`${gantry.motorwayName}-${index}`}
          position={{ lat: gantry.lat, lng: gantry.lng }}
          title={gantry.motorwayName}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 11,
            fillColor: "#a855f7",
            fillOpacity: 1,
            strokeColor: "#a855f7",
            strokeWeight: 0,
          }}
          label={{ text: "$", color: "white", fontSize: "11px", fontWeight: "bold" }}
        />
      ))}
      <FitBoundsToRoutes routes={routes} />
    </Map>
  );
}
