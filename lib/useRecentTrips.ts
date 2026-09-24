"use client";

import { useCallback, useSyncExternalStore } from "react";

export type RecentTrip = {
  originLabel: string;
  originPlaceId: string;
  destinationLabel: string;
  destinationPlaceId: string;
  tollCents: number | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  searchedAt: string;
};

const STORAGE_KEY = "route-planner:recent-trips";
const MAX_TRIPS = 10;
const EMPTY: RecentTrip[] = [];

// Pure list update, extracted so it's testable without a DOM/localStorage.
export function prependTrip(
  trips: RecentTrip[],
  trip: RecentTrip,
  max = MAX_TRIPS,
): RecentTrip[] {
  return [trip, ...trips].slice(0, max);
}

// localStorage as a tiny external store. The parsed array is cached by its
// raw string so useSyncExternalStore gets a stable reference between reads.
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedTrips: RecentTrip[] = EMPTY;

function getSnapshot(): RecentTrip[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedTrips = raw ? (JSON.parse(raw) as RecentTrip[]) : EMPTY;
    } catch {
      cachedTrips = EMPTY;
    }
  }
  return cachedTrips;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// Recent-search history, kept client-side only (no server persistence - see
// spec section 8, "Persistence: None"). If storage is unavailable (private
// browsing, quota), history simply isn't kept.
export function useRecentTrips() {
  const trips = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  const addTrip = useCallback((trip: RecentTrip) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prependTrip(getSnapshot(), trip)));
    } catch {
      return;
    }
    listeners.forEach((listener) => listener());
  }, []);

  return { trips, addTrip };
}
