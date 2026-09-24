// Itemized per-gantry toll breakdown for the trip summary screen, sourced from
// TfNSW's Toll Calculator Match API (opendata.transport.nsw.gov.au). This is
// display-only: Google's tollInfo total (lib/normalizeRoutes.ts) stays the
// source of truth for selection/budget logic (see docs/spot-check-tolls
// findings - TfNSW is ~5-9% lower than Google on known tollways, and has
// missed the Sydney Harbour Bridge/Tunnel entirely in testing despite high
// confidence scores). Callers must treat a low confidence or a missing toll
// as "breakdown unavailable," not as a confirmed $0.
const MATCH_URL = "https://api.transport.nsw.gov.au/v2/roads/toll_calc/match";
const LIGHT_VEHICLE_CLASS = "A";
const MIN_USABLE_CONFIDENCE = 0.7;
// The gateway can hang ~60s before returning a 504; cap each attempt so the
// trip summary gives up in seconds rather than minutes. Successful matches
// took ~1-7s in manual testing.
const ATTEMPT_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;

export type GantryCharge = {
  motorwayName: string;
  chargeType: string;
  cents: number;
  lat: number | null;
  lng: number | null;
};

export type TollBreakdown =
  | { status: "ok"; confidence: number; gantries: GantryCharge[] }
  | { status: "unavailable"; reason: string };

type TfnswCharge = { vehicleClass: string; chargeInCents: number };
type TfnswGantryVisit = {
  gantry: { motorwayName: string; chargeType: string; latitude?: number; longitude?: number };
};
type TfnswTollCharged = {
  chargeType: string;
  charges: TfnswCharge[];
  gantryVisits?: TfnswGantryVisit[];
};
type TfnswMatchResponse = {
  match?: {
    confidence: number;
    tollsCharged: TfnswTollCharged[];
  };
};

function chargeForLightVehicle(charges: TfnswCharge[]): number | null {
  const charge = charges.find((c) => c.vehicleClass === LIGHT_VEHICLE_CLASS);
  return charge ? charge.chargeInCents : null;
}

async function callMatchApi(
  encodedPolyline: string,
  apiKey: string,
): Promise<TfnswMatchResponse> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(MATCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `apikey ${apiKey}`,
        },
        body: JSON.stringify({ polyline: encodedPolyline }),
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
      if (response.ok) return (await response.json()) as TfnswMatchResponse;
    } catch {
      // Timeout or network error: fall through to retry.
    }
    // The TfNSW gateway is intermittently flaky (observed 504s that succeed
    // on retry during manual testing); back off briefly before retrying.
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("TfNSW match API did not respond successfully");
}

export async function fetchTollBreakdown(
  encodedPolyline: string,
  apiKey: string,
): Promise<TollBreakdown> {
  let response: TfnswMatchResponse;
  try {
    response = await callMatchApi(encodedPolyline, apiKey);
  } catch {
    return { status: "unavailable", reason: "The toll breakdown service did not respond." };
  }

  const match = response.match;
  if (!match) {
    return { status: "unavailable", reason: "No match was found for this route." };
  }
  if (match.confidence < MIN_USABLE_CONFIDENCE) {
    return { status: "unavailable", reason: "The route match confidence was too low to trust." };
  }

  const gantries: GantryCharge[] = [];
  for (const tollCharged of match.tollsCharged) {
    const cents = chargeForLightVehicle(tollCharged.charges);
    if (cents === null) continue;
    const gantry = tollCharged.gantryVisits?.[0]?.gantry;
    gantries.push({
      motorwayName: gantry?.motorwayName ?? "Toll road",
      chargeType: tollCharged.chargeType,
      cents,
      lat: gantry?.latitude ?? null,
      lng: gantry?.longitude ?? null,
    });
  }

  return { status: "ok", confidence: match.confidence, gantries };
}
