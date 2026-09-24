function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-sm font-medium text-neutral-500">{title}</h2>
      <div className="divide-y divide-border rounded-2xl bg-surface">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-neutral-100">{label}</span>
      <span className="text-sm text-neutral-400">{value}</span>
    </div>
  );
}

export default function MorePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-8">
      <h1 className="text-2xl font-bold text-neutral-50">More</h1>

      <Section title="Trip assumptions">
        <Row label="Vehicle" value="Standard passenger vehicle" />
        <Row label="Toll pass" value="AU e-toll tag" />
        <Row label="Coverage" value="Sydney, Australia only" />
      </Section>

      <Section title="Data sources">
        <Row label="Routes and toll totals" value="Google Routes API" />
        <Row label="Toll passage breakdown" value="Transport for NSW" />
      </Section>

      <section className="mt-6 rounded-2xl bg-surface p-4 text-sm text-neutral-400">
        <p>
          Estimates may change with traffic, route recalculation and toll rules. The Google total
          shown on each route is what this app uses to pick routes; the itemized toll passages on
          the trip summary screen come from a separate government data source and may not list
          every toll on a route.
        </p>
        <p className="mt-3">
          Opening a route in Google Maps hands off the origin and destination (and, where
          possible, a few waypoints along the selected corridor). Google Maps may recalculate and
          choose a different route, so check the route and tolls there before you drive.
        </p>
      </section>

      <Section title="Help">
        <a
          href="https://github.com/dpark2380/route-planner/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-4 py-3 text-sm font-medium text-accent"
        >
          Report an issue
        </a>
      </Section>
    </div>
  );
}
