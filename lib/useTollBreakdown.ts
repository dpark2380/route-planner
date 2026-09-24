"use client";

import { useEffect, useState } from "react";
import type { TollBreakdown } from "./tollBreakdown";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; breakdown: TollBreakdown };

// Shared across hook instances so the map pins and the trip summary sheet
// don't each call TfNSW for the same route. Only successful lookups stay
// cached; an "unavailable" result is dropped so reopening retries.
const breakdownCache = new Map<string, Promise<TollBreakdown>>();

function loadBreakdown(encodedPolyline: string): Promise<TollBreakdown> {
  const cached = breakdownCache.get(encodedPolyline);
  if (cached) return cached;

  const request = fetch("/api/toll-breakdown", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ encodedPolyline }),
  })
    .then((response) => response.json() as Promise<TollBreakdown>)
    .catch(
      (): TollBreakdown => ({
        status: "unavailable",
        reason: "The toll breakdown request failed.",
      }),
    )
    .then((breakdown) => {
      if (breakdown.status !== "ok") breakdownCache.delete(encodedPolyline);
      return breakdown;
    });

  breakdownCache.set(encodedPolyline, request);
  return request;
}

// Fetches the per-gantry breakdown for one route's polyline, on demand (not
// for every route on every search - see lib/tollBreakdown.ts for why this
// stays a display-only supplement to Google's total, not a replacement).
export function useTollBreakdown(encodedPolyline: string | null): State {
  const [result, setResult] = useState<{ polyline: string; breakdown: TollBreakdown } | null>(
    null,
  );

  useEffect(() => {
    if (!encodedPolyline) return;
    let cancelled = false;

    loadBreakdown(encodedPolyline).then((breakdown) => {
      if (!cancelled) setResult({ polyline: encodedPolyline, breakdown });
    });

    return () => {
      cancelled = true;
    };
  }, [encodedPolyline]);

  if (!encodedPolyline) return { status: "idle" };
  if (result?.polyline !== encodedPolyline) return { status: "loading" };
  return { status: "done", breakdown: result.breakdown };
}
