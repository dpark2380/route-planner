import type { Toll } from "@/types/route";

export function formatDuration(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Parses a typed dollar amount into whole cents clamped to [0, maxCents].
// Returns null for text that isn't a number yet (e.g. "", "-", "."), so a
// half-typed value doesn't reset the budget.
export function parseDollarsToCents(text: string, maxCents: number): number | null {
  if (text.trim() === "") return null;
  const dollars = Number(text);
  if (!Number.isFinite(dollars)) return null;
  return Math.min(maxCents, Math.max(0, Math.round(dollars * 100)));
}

export function formatToll(toll: Toll): string {
  if (toll.status === "estimated") return formatCents(toll.cents);
  if (toll.status === "none") return "No tolls";
  return "Toll unavailable";
}
