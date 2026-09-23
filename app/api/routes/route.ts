import { NextResponse } from "next/server";
import { validateRouteSearchRequest } from "@/lib/validateRouteSearchRequest";
import {
  fetchRouteAlternatives,
  QuotaExceededError,
  UpstreamError,
  UpstreamTimeoutError,
} from "@/lib/googleRoutes";
import { normalizeRoutes } from "@/lib/normalizeRoutes";
import type { RouteSearchError, RouteSearchResult } from "@/types/route";

function errorResponse(error: RouteSearchError, status: number) {
  return NextResponse.json(error, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const validation = validateRouteSearchRequest(body);

  if (!validation.valid) {
    return errorResponse(
      { code: "INVALID_INPUT", message: validation.message },
      400,
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) {
    return errorResponse(
      { code: "UPSTREAM_ERROR", message: "Routing is not configured yet." },
      500,
    );
  }

  const { origin, destination } = validation.request;

  try {
    const { normal, avoidTolls } = await fetchRouteAlternatives(
      origin,
      destination,
      apiKey,
    );
    const routes = normalizeRoutes(normal, avoidTolls);

    if (routes.length === 0) {
      return errorResponse(
        { code: "NO_ROUTE_FOUND", message: "No route was found." },
        404,
      );
    }

    const result: RouteSearchResult = {
      routes,
      calculatedAt: new Date().toISOString(),
      passAssumption: "AU_ETOLL_TAG",
      notices: [
        "Estimates may change with traffic, route recalculation and toll rules.",
      ],
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UpstreamTimeoutError) {
      return errorResponse(
        { code: "UPSTREAM_TIMEOUT", message: "The route search timed out." },
        504,
      );
    }
    if (error instanceof QuotaExceededError) {
      return errorResponse(
        { code: "QUOTA_EXCEEDED", message: "The route search quota was exceeded." },
        429,
      );
    }
    if (error instanceof UpstreamError) {
      return errorResponse(
        { code: "UPSTREAM_ERROR", message: "The route search failed." },
        502,
      );
    }
    throw error;
  }
}
