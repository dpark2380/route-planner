"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { APIProvider } from "@vis.gl/react-google-maps";
import { LocationSearch, type SelectedPlace } from "@/components/LocationSearch";
import { RouteMap } from "@/components/RouteMap";
import { RouteOptionsView } from "@/components/RouteOptionsView";
import { TripSummarySheet } from "@/components/TripSummarySheet";
import { useRouteSearch } from "@/lib/useRouteSearch";
import { useTollBreakdown } from "@/lib/useTollBreakdown";
import {
  isKnownPrice,
  selectBestValue,
  selectDisplayRoutes,
  selectWithinBudget,
} from "@/lib/selectRoutes";
import { buildGoogleMapsUrl } from "@/lib/mapsHandoff";
import { OriginIcon, DestinationIcon, SwapIcon, ArrowRightIcon } from "@/components/icons";
import { useRecentTrips } from "@/lib/useRecentTrips";

function computeMaxBudgetCents(highestKnownTollCents: number): number {
  return Math.max(100, Math.ceil(highestKnownTollCents / 100) * 100);
}

function placeFromParams(
  params: ReadonlyURLSearchParams,
  prefix: "origin" | "destination",
): SelectedPlace | null {
  const placeId = params.get(`${prefix}PlaceId`);
  const label = params.get(`${prefix}Label`);
  return placeId && label ? { placeId, label } : null;
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const browserApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  const searchParams = useSearchParams();
  // Prefilled from a Trips-tab link, e.g. /?originPlaceId=...&originLabel=...
  const [origin, setOrigin] = useState<SelectedPlace | null>(() =>
    placeFromParams(searchParams, "origin"),
  );
  const [destination, setDestination] = useState<SelectedPlace | null>(() =>
    placeFromParams(searchParams, "destination"),
  );
  const [budgetCents, setBudgetCents] = useState(0);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [view, setView] = useState<"plan" | "routeOptions">("plan");
  const [showSummary, setShowSummary] = useState(false);
  const { state, search } = useRouteSearch();
  const { addTrip } = useRecentTrips();

  const routes = useMemo(
    () => (state.status === "success" ? state.result.routes : []),
    [state],
  );

  const maxBudgetCents = useMemo(() => {
    const highest = Math.max(
      0,
      ...routes.filter(isKnownPrice).map((route) => route.toll.cents),
    );
    return computeMaxBudgetCents(highest);
  }, [routes]);

  const displayRoutes = useMemo(
    () => selectDisplayRoutes(routes, budgetCents),
    [routes, budgetCents],
  );
  const withinBudget = useMemo(
    () => selectWithinBudget(routes, budgetCents),
    [routes, budgetCents],
  );
  const bestValue = useMemo(
    () => selectBestValue(routes, budgetCents),
    [routes, budgetCents],
  );

  const canCompare = origin !== null && destination !== null && origin.placeId !== destination.placeId;

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleCompare = async () => {
    if (!origin || !destination) return;
    setSelectedRouteId(null);
    setBudgetCents(0);
    const result = await search({ placeId: origin.placeId }, { placeId: destination.placeId });
    if (!result) return;

    setView("routeOptions");
    const fastest = [...result.routes].sort((a, b) => a.durationSeconds - b.durationSeconds)[0];
    addTrip({
      originLabel: origin.label,
      originPlaceId: origin.placeId,
      destinationLabel: destination.label,
      destinationPlaceId: destination.placeId,
      tollCents: fastest?.toll.status === "estimated" ? fastest.toll.cents : null,
      distanceMeters: fastest?.distanceMeters ?? null,
      durationSeconds: fastest?.durationSeconds ?? null,
      searchedAt: result.calculatedAt,
    });
  };

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  );
  const summaryRoute = selectedRoute ?? withinBudget ?? null;

  const mapsUrl =
    origin && destination
      ? buildGoogleMapsUrl(origin, destination, summaryRoute?.encodedPolyline)
      : null;

  const highlightedBreakdown = useTollBreakdown(
    view === "routeOptions" ? (summaryRoute?.encodedPolyline ?? null) : null,
  );
  const gantries =
    highlightedBreakdown.status === "done" && highlightedBreakdown.breakdown.status === "ok"
      ? highlightedBreakdown.breakdown.gantries
      : [];

  if (!browserApiKey) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Missing NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: the app cannot load without it.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={browserApiKey}>
      {view === "routeOptions" && state.status === "success" ? (
        <>
          <RouteOptionsView
            routes={routes}
            displayRoutes={displayRoutes}
            bestValue={bestValue}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
            budgetCents={budgetCents}
            maxBudgetCents={maxBudgetCents}
            onBudgetChange={setBudgetCents}
            withinBudgetId={withinBudget?.id ?? null}
            mapsUrl={mapsUrl}
            gantries={gantries}
            onBack={() => setView("plan")}
            onOpenSummary={() => setShowSummary(true)}
          />
          {showSummary && summaryRoute && origin && destination && (
            <TripSummarySheet
              route={summaryRoute}
              origin={origin}
              destination={destination}
              onClose={() => setShowSummary(false)}
            />
          )}
        </>
      ) : (
        <div className="relative min-h-screen">
          <div className="fixed inset-0">
            <RouteMap routes={[]} highlightedRouteId={null} className="h-full w-full" />
          </div>

          <div className="relative mx-auto max-w-2xl px-4 pt-8">
            <div className="rounded-3xl bg-surface p-5 shadow-xl">
              <h1 className="text-2xl font-bold text-neutral-50">Plan a toll trip</h1>
              <p className="mt-1 text-sm text-neutral-400">
                Compare routes, tolls, and travel time before you leave.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <LocationSearch
                  caption="From"
                  placeholder="Current location or address"
                  value={origin?.label ?? ""}
                  icon={<OriginIcon />}
                  onSelect={setOrigin}
                />
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleSwap}
                    disabled={!origin && !destination}
                    aria-label="Swap origin and destination"
                    className="-my-2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-neutral-300 disabled:opacity-40"
                  >
                    <SwapIcon />
                  </button>
                </div>
                <LocationSearch
                  caption="To"
                  placeholder="Where are you going?"
                  value={destination?.label ?? ""}
                  icon={<DestinationIcon />}
                  onSelect={setDestination}
                />
              </div>

              {origin && destination && origin.placeId === destination.placeId && (
                <p className="mt-3 text-sm text-red-400">Origin and destination must differ.</p>
              )}

              <div className="mt-3 rounded-2xl bg-surface-raised px-4 py-2.5 text-xs text-neutral-400">
                Toll pass assumption: <span className="text-neutral-200">AU e-toll tag</span> &middot;
                estimates may change with traffic, route recalculation and toll rules.
              </div>

              <button
                type="button"
                disabled={!canCompare || state.status === "loading"}
                onClick={handleCompare}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent-strong py-3.5 font-semibold text-white disabled:opacity-40"
              >
                {state.status === "loading" ? "Comparing routes…" : "Compare routes"}
                {state.status !== "loading" && <ArrowRightIcon />}
              </button>

              {state.status === "error" && (
                <div className="mt-3 rounded-2xl bg-red-500/10 p-3 text-sm text-red-300">
                  <p>The route search could not complete: {state.error.message}</p>
                  <button type="button" onClick={handleCompare} className="mt-2 font-medium underline">
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </APIProvider>
  );
}
