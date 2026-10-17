"use client";
import { COUNTRIES, countryName } from "@/lib/geo";
import type { Loc } from "@/lib/client";
import { Toggle } from "./Filters";

const SORTED = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

export function CountrySelect({ value, onChange, id }: { value: string; onChange: (code: string) => void; id: string }) {
  return (
    <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Not set (show everything)</option>
      {SORTED.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export default function LocationPanel({
  loc,
  setLoc,
  counts,
  localSources,
  loading,
}: {
  loc: Loc;
  setLoc: (l: Loc) => void;
  counts: { local: number; remote: number; abroad: number };
  localSources?: { adzuna: boolean; jooble: boolean };
  loading: boolean;
}) {
  const name = countryName(loc.country);
  const noLocal = !!loc.country && counts.local === 0 && !loading;
  const hasLocalKey = !!(localSources?.adzuna || localSources?.jooble);

  return (
    <section className="card p-4" aria-label="Your location">
      <h2 className="font-semibold">Your location</h2>
      <div className="mt-3 space-y-3">
        <div>
          <label className="label" htmlFor="country">
            Country
          </label>
          <CountrySelect id="country" value={loc.country} onChange={(country) => setLoc({ ...loc, country, manual: true })} />
        </div>
        <div>
          <label className="label" htmlFor="city">
            City <span className="font-normal normal-case text-muted">(optional)</span>
          </label>
          <input id="city" className="input" placeholder="e.g. Lagos" value={loc.city} onChange={(e) => setLoc({ ...loc, city: e.target.value, manual: true })} />
        </div>
        <Toggle checked={loc.abroad} onChange={(abroad) => setLoc({ ...loc, abroad })} disabled={!loc.country}>
          Include jobs outside {name || "my country"}
        </Toggle>
        {loc.country && (
          <p className="text-xs text-muted">
            <strong className="text-fg">{counts.local}</strong> in {name} · <strong className="text-fg">{counts.remote}</strong> remote you can take ·{" "}
            <strong className="text-fg">{counts.abroad}</strong> abroad{loc.abroad ? "" : " (hidden)"}
          </p>
        )}
        {noLocal && !hasLocalKey && (
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs">
            No on-site jobs in {name} yet. The free remote boards rarely list them. Add a free Jooble or Adzuna key to get local listings (see the README).
          </p>
        )}
      </div>
    </section>
  );
}
