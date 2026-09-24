"use client";

import { useState } from "react";
import type { RouteOption } from "@/types/route";
import type { DisplayRoute, BestValueSuggestion } from "@/lib/selectRoutes";
import { formatCents, formatDistance, formatDuration, formatToll } from "@/lib/format";
import { RouteMap } from "./RouteMap";
import { TollBudgetControl } from "./TollBudgetControl";
import { BackArrowIcon, ShareIcon } from "./icons";
import type { GantryCharge } from "@/lib/tollBreakdown";

type Props = {
  routes: RouteOption[];
  displayRoutes: DisplayRoute[];
  bestValue: BestValueSuggestion | null;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  budgetCents: number;
  maxBudgetCents: number;
  onBudgetChange: (cents: number) => void;
  withinBudgetId: string | null;
  mapsUrl: string | null;
  gantries: GantryCharge[];
  onBack: () => void;
  onOpenSummary: () => void;
};

export function RouteOptionsView({
  routes,
  displayRoutes,
  bestValue,
  selectedRouteId,
  onSelectRoute,
  budgetCents,
  maxBudgetCents,
  onBudgetChange,
  withinBudgetId,
  mapsUrl,
  gantries,
  onBack,
  onOpenSummary,
}: Props) {
  const [showLegend, setShowLegend] = useState(false);
  const highlightedId = selectedRouteId ?? withinBudgetId;

  const handleShare = async () => {
    if (!mapsUrl) return;
    if (navigator.share) {
      await navigator.share({ url: mapsUrl, title: "Route" }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(mapsUrl).catch(() => {});
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to plan"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-neutral-200"
        >
          <BackArrowIcon />
        </button>
        <h1 className="text-base font-semibold text-neutral-50">Route options</h1>
        <button
          type="button"
          onClick={handleShare}
          disabled={!mapsUrl}
          aria-label="Share route"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-neutral-200 disabled:opacity-40"
        >
          <ShareIcon />
        </button>
      </header>

      <div className="relative">
        <RouteMap
          routes={routes}
          highlightedRouteId={highlightedId}
          className="h-64 w-full"
          gantries={gantries}
        />
        <button
          type="button"
          onClick={() => setShowLegend((v) => !v)}
          className="absolute right-3 top-3 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-medium text-neutral-100 backdrop-blur"
        >
          Map legend
        </button>
        {showLegend && (
          <div className="absolute right-3 top-12 w-56 rounded-xl bg-surface-raised p-3 text-xs text-neutral-300 shadow-lg">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-accent" />
              Selected route
            </div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-neutral-500" />
              Other routes
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold text-white">
                $
              </span>
              Toll gantry (selected route)
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {displayRoutes.map(({ route, badges }, index) => {
            const isSelected = route.id === highlightedId;
            // The price line already says when a toll is unavailable.
            const heading =
              badges.find((badge) => badge !== "Toll cost unavailable") ?? `Route ${index + 1}`;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => onSelectRoute(route.id)}
                className={`flex min-w-[9.5rem] shrink-0 flex-col items-start rounded-2xl px-4 py-3 text-left ${
                  isSelected ? "bg-accent-strong text-white" : "bg-surface text-neutral-200"
                }`}
              >
                <span className={`text-xs ${isSelected ? "text-emerald-100" : "text-neutral-400"}`}>
                  {heading}
                </span>
                <span className="text-lg font-semibold">{formatToll(route.toll)}</span>
                <span className={`text-xs ${isSelected ? "text-emerald-100" : "text-neutral-400"}`}>
                  {formatDistance(route.distanceMeters)} &middot; {formatDuration(route.durationSeconds)}
                </span>
              </button>
            );
          })}
        </div>

        {bestValue && (
          <button
            type="button"
            onClick={() => onSelectRoute(bestValue.route.id)}
            className="rounded-2xl border border-accent-strong/40 bg-surface p-4 text-left"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-accent">
              Worth considering
            </div>
            <div className="mt-1 text-sm font-semibold text-neutral-50">
              Spend {formatCents(bestValue.extraOverBaseCents)} more to save{" "}
              {Math.round(bestValue.minutesSavedVsBase)} min
            </div>
            <div className="mt-1 text-xs text-neutral-400">
              {formatCents(bestValue.extraOverBudgetCents)} over your budget. Tap to select it.
            </div>
          </button>
        )}

        <TollBudgetControl
          budgetCents={budgetCents}
          maxBudgetCents={maxBudgetCents}
          onChange={onBudgetChange}
        />

        {!withinBudgetId && (
          <p className="rounded-2xl bg-amber-500/10 p-3 text-sm text-amber-300">
            No route has a reliable price at or under your budget. The cheapest known-price route
            and any toll-avoidance candidate are shown above for inspection.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <a
            href={mapsUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!mapsUrl}
            className={`flex items-center justify-center rounded-full border border-border py-3 text-sm font-medium text-neutral-100 ${
              !mapsUrl ? "pointer-events-none opacity-40" : ""
            }`}
          >
            View in Maps
          </a>
          <button
            type="button"
            onClick={onOpenSummary}
            disabled={!highlightedId}
            className="flex items-center justify-center rounded-full bg-accent-strong py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Trip summary
          </button>
        </div>
      </div>
    </div>
  );
}
