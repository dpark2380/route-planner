"use client";

import { useEffect, useMemo } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

// Adapted from the official @vis.gl/react-google-maps routes-api example,
// since the library doesn't ship a Polyline component itself.
type Props = google.maps.PolylineOptions & { encodedPath: string };

export function RoutePolyline({ encodedPath, ...polylineOptions }: Props) {
  const map = useMap();
  const geometryLibrary = useMapsLibrary("geometry");
  const mapsLibrary = useMapsLibrary("maps");
  const polyline = useMemo(
    () => (mapsLibrary ? new mapsLibrary.Polyline() : null),
    [mapsLibrary],
  );

  useEffect(() => {
    if (!polyline) return;
    polyline.setOptions(polylineOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polyline, JSON.stringify(polylineOptions)]);

  useEffect(() => {
    if (!encodedPath || !geometryLibrary || !polyline) return;
    polyline.setPath(geometryLibrary.encoding.decodePath(encodedPath));
  }, [polyline, encodedPath, geometryLibrary]);

  useEffect(() => {
    if (!map || !polyline) return;
    polyline.setMap(map);
    return () => polyline.setMap(null);
  }, [map, polyline]);

  return null;
}
