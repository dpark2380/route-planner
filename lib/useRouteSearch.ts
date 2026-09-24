"use client";

import { useCallback, useRef, useState } from "react";
import type { PlaceRef, RouteSearchError, RouteSearchResult } from "@/types/route";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: RouteSearchResult }
  | { status: "error"; error: RouteSearchError };

// One fetch per "Compare routes" tap; all further recomputation (slider,
// labels, best-value) happens client-side against the stored result (spec section 8).
export function useRouteSearch() {
  const [state, setState] = useState<State>({ status: "idle" });
  const latestRequestId = useRef(0);

  // Resolves with the result (or null on failure) so callers can react in
  // their event handler. Responses from superseded requests are dropped, so a
  // slow earlier search can't overwrite a newer one.
  const search = useCallback(
    async (origin: PlaceRef, destination: PlaceRef): Promise<RouteSearchResult | null> => {
      const requestId = ++latestRequestId.current;
      setState({ status: "loading" });

      let next: State;
      try {
        const response = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin, destination }),
        });
        const body = await response.json();
        next = response.ok
          ? { status: "success", result: body as RouteSearchResult }
          : { status: "error", error: body as RouteSearchError };
      } catch {
        next = {
          status: "error",
          error: { code: "UPSTREAM_ERROR", message: "The route search could not complete." },
        };
      }

      if (requestId !== latestRequestId.current) return null;
      setState(next);
      return next.status === "success" ? next.result : null;
    },
    [],
  );

  return { state, search };
}
