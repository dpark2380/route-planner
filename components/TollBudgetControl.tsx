"use client";

import { useState } from "react";
import { formatCents, parseDollarsToCents } from "@/lib/format";

type Props = {
  budgetCents: number;
  maxBudgetCents: number;
  onChange: (budgetCents: number) => void;
};

export function TollBudgetControl({ budgetCents, maxBudgetCents, onChange }: Props) {
  // What the user is typing, kept as-is until they leave the field, so "2."
  // on the way to "2.50" isn't reformatted to "2.00" mid-keystroke.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
      <label htmlFor="toll-budget" className="text-sm font-medium text-neutral-200">
        Toll budget: <span className="text-accent">{formatCents(budgetCents)}</span>
      </label>
      <input
        id="toll-budget"
        type="range"
        min={0}
        max={maxBudgetCents}
        step={50}
        value={budgetCents}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-accent"
      />
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <span>Exact amount:</span>
        <span className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
            $
          </span>
          {/* Text + decimal keypad rather than type="number": number inputs
              report partial entries like "2." inconsistently across browsers. */}
          <input
            type="text"
            inputMode="decimal"
            aria-label="Exact toll budget in dollars"
            value={draft ?? (budgetCents / 100).toFixed(2)}
            onChange={(event) => {
              setDraft(event.target.value);
              const cents = parseDollarsToCents(event.target.value, maxBudgetCents);
              if (cents !== null) onChange(cents);
            }}
            onBlur={() => setDraft(null)}
            className="w-24 rounded-md border border-border bg-surface-raised py-1 pl-5 pr-2 text-neutral-100"
          />
        </span>
      </div>
    </div>
  );
}
