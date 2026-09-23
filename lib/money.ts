// google.type.Money: units is a decimal integer string, nanos is 1e-9 of a unit.
export type GoogleMoney = {
  currencyCode: string;
  units?: string;
  nanos?: number;
};

const NANOS_PER_CENT = 1e7;

// Returns cents if the money is in AUD, null otherwise (unlike currencies are never compared).
export function moneyToAudCents(money: GoogleMoney): number | null {
  if (money.currencyCode !== "AUD") return null;
  const units = money.units ? BigInt(money.units) : BigInt(0);
  const nanos = money.nanos ?? 0;
  return Number(units) * 100 + Math.round(nanos / NANOS_PER_CENT);
}
