"use client";

import type { RouteOption } from "@/types/route";
import type { HandoffLocation } from "@/lib/mapsHandoff";
import { formatCents, formatDistance, formatDuration, formatToll } from "@/lib/format";
import { useTollBreakdown } from "@/lib/useTollBreakdown";

type Props = {
  route: RouteOption;
  origin: HandoffLocation;
  destination: HandoffLocation;
  onClose: () => void;
};

export function TripSummarySheet({ route, origin, destination, onClose }: Props) {
  const breakdown = useTollBreakdown(route.encodedPolyline);

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-background pb-24">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between border-b border-border px-4 py-3">
        <span className="w-14" />
        <h1 className="text-base font-semibold text-neutral-50">Trip summary</h1>
        <button type="button" onClick={onClose} className="text-sm font-medium text-accent">
          Done
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-4">
        <div className="rounded-2xl bg-gradient-to-br from-accent to-accent-strong p-4 text-white">
          <div className="text-xs font-medium text-emerald-50/80">Estimated toll (our total)</div>
          <div className="text-3xl font-bold">{formatToll(route.toll)}</div>
          <div className="mt-3 flex gap-6 border-t border-white/20 pt-3 text-sm">
            <div>
              <div className="text-emerald-50/70">Distance</div>
              <div className="font-semibold">{formatDistance(route.distanceMeters)}</div>
            </div>
            <div>
              <div className="text-emerald-50/70">Travel time</div>
              <div className="font-semibold">{formatDuration(route.durationSeconds)}</div>
            </div>
          </div>
        </div>

        <section className="rounded-2xl bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-200">Trip details</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-neutral-400">From</dt>
              <dd className="text-right text-neutral-100">{origin.label}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-neutral-400">To</dt>
              <dd className="text-right text-neutral-100">{destination.label}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <dt className="text-neutral-400">Vehicle</dt>
              <dd className="text-neutral-100">Standard passenger vehicle</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-400">Toll pass assumption</dt>
              <dd className="text-neutral-100">AU e-toll tag</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-200">Toll passages</h2>
          {breakdown.status !== "done" && (
            <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading toll passages">
              <div className="h-10 animate-pulse rounded-lg bg-surface-raised" />
              <div className="h-10 animate-pulse rounded-lg bg-surface-raised" />
            </div>
          )}
          {breakdown.status === "done" && breakdown.breakdown.status === "unavailable" && (
            <p className="text-sm text-neutral-400">
              Detailed toll passages aren&apos;t available for this route ({breakdown.breakdown.reason}).
              The total above is still our best estimate and is what we use to pick routes.
            </p>
          )}
          {breakdown.status === "done" && breakdown.breakdown.status === "ok" && (
            <>
              {breakdown.breakdown.gantries.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  {route.toll.status === "none"
                    ? "No tolls on this route."
                    : `We couldn't split the ${formatToll(route.toll)} total into individual tolls for this route.`}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {breakdown.breakdown.gantries.map((gantry, index) => (
                    <li
                      key={`${gantry.motorwayName}-${index}`}
                      className="flex justify-between border-b border-border pb-2 text-sm last:border-0 last:pb-0"
                    >
                      <span className="text-neutral-100">{gantry.motorwayName}</span>
                      <span className="font-medium text-accent">{formatCents(gantry.cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-neutral-500">
                Passages come from a separate NSW government data source and may not list every toll
                on this route (for example, the Sydney Harbour Bridge/Tunnel has been missed in
                testing). The total above, from Google, is what this app uses to select routes.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
