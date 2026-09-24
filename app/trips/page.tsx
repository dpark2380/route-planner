"use client";

import Link from "next/link";
import { useRecentTrips } from "@/lib/useRecentTrips";
import { formatCents, formatDistance, formatDuration } from "@/lib/format";

export default function TripsPage() {
  const { trips } = useRecentTrips();

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <h1 className="text-2xl font-bold text-neutral-50">Recent trips</h1>

      {trips.length === 0 ? (
        <div role="status" className="mt-8 rounded-2xl bg-surface p-6 text-center">
          <p className="text-sm text-neutral-300">No recent trips yet.</p>
          <p className="mt-1 text-sm text-neutral-500">
            Compare a route from the Plan tab and it will show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {trips.map((trip, index) => {
            const params = new URLSearchParams({
              originPlaceId: trip.originPlaceId,
              originLabel: trip.originLabel,
              destinationPlaceId: trip.destinationPlaceId,
              destinationLabel: trip.destinationLabel,
            });
            return (
              <li key={`${trip.searchedAt}-${index}`}>
                <Link
                  href={`/?${params.toString()}`}
                  className="block rounded-2xl bg-surface p-4 transition hover:bg-surface-raised"
                >
                  <div className="text-sm font-medium text-neutral-100">
                    {trip.originLabel} &rarr; {trip.destinationLabel}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                    <span className="text-accent">
                      {trip.tollCents !== null ? formatCents(trip.tollCents) : "Toll unknown"}
                    </span>
                    {trip.distanceMeters !== null && <span>{formatDistance(trip.distanceMeters)}</span>}
                    {trip.durationSeconds !== null && <span>{formatDuration(trip.durationSeconds)}</span>}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {new Date(trip.searchedAt).toLocaleString()}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
