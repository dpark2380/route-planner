"use client";

import { useEffect, useRef } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import type { HandoffLocation } from "@/lib/mapsHandoff";

export type SelectedPlace = HandoffLocation & { placeId: string };

type Props = {
  caption: string;
  placeholder: string;
  value: string;
  icon: React.ReactNode;
  onSelect: (place: SelectedPlace) => void;
};

// Theme the shadow-DOM autocomplete input to match the app's dark surface;
// these custom properties are documented to pierce the shadow boundary.
const AUTOCOMPLETE_THEME_VARS = {
  "--gmp-mat-color-surface": "transparent",
  "--gmp-mat-color-on-surface": "#f4f5f5",
  "--gmp-mat-color-on-surface-variant": "#9ca3af",
  "--gmp-mat-color-outline-decorative": "transparent",
  "--gmp-mat-color-primary": "#22c55e",
} as React.CSSProperties;

// @vis.gl/react-google-maps has no built-in wrapper for the new
// PlaceAutocompleteElement web component, so it's mounted manually per
// Google's documented pattern (google.maps.importLibrary("places")).
export function LocationSearch({ caption, placeholder, value, icon, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const placesLibrary = useMapsLibrary("places");

  useEffect(() => {
    if (!placesLibrary || !containerRef.current) return;

    const element = new placesLibrary.PlaceAutocompleteElement({
      includedRegionCodes: ["au"],
    });
    element.setAttribute("placeholder", placeholder);
    containerRef.current.replaceChildren(element);
    elementRef.current = element;

    const handleSelect = async (
      event: google.maps.places.PlacePredictionSelectEvent,
    ) => {
      const place = event.placePrediction.toPlace();
      await place.fetchFields({ fields: ["displayName", "formattedAddress"] });
      onSelect({
        placeId: place.id,
        label: place.displayName ?? place.formattedAddress ?? placeholder,
      });
    };

    element.addEventListener("gmp-select", handleSelect);
    return () => {
      element.removeEventListener("gmp-select", handleSelect);
      elementRef.current = null;
    };
  }, [placesLibrary, placeholder, onSelect]);

  // The autocomplete element manages its own text; sync it when the parent's
  // selection changes from elsewhere (swap button, a prefilled trip), not on
  // every render. Re-runs when the element is first created, so an initial
  // value set before the Places library loaded still shows up.
  useEffect(() => {
    if (elementRef.current && elementRef.current.value !== value) {
      elementRef.current.value = value;
    }
  }, [value, placesLibrary]);

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          {caption}
        </div>
        <div ref={containerRef} style={AUTOCOMPLETE_THEME_VARS} />
      </div>
    </div>
  );
}
