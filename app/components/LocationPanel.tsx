"use client";
import { useId } from "react";
import { MapPin } from "lucide-react";
import { COUNTRIES, countryName } from "@/lib/geo";
import { useApp } from "@/lib/store";
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

export default function LocationPanel() {
  const { loc, setLoc, counts, data, searching } = useApp();
  const uid = useId();
  const name = countryName(loc.country);
  const noLocal = !!loc.country && counts.local === 0 && !searching && !!data;
  const hasLocalKey = !!(data?.localSources.adzuna || data?.localSources.jooble);

  return (
    <section className="card p-4" aria-label="Your location">
      <h2 className="flex items-center gap-2 font-semibold">
        <MapPin size={16} className="text-accent" /> Your location
      </h2>
      <div className="mt-3 space-y-3">
        <div>
          <label className="label" htmlFor={`${uid}-country`}>
            Country
          </label>
          <CountrySelect id={`${uid}-country`} value={loc.country} onChange={(country) => setLoc({ ...loc, country, manual: true })} />
        </div>
        <div>
          <label className="label" htmlFor={`${uid}-city`}>
            City <span className="font-normal normal-case tracking-normal text-muted">(optional)</span>
          </label>
          <input id={`${uid}-city`} className="input" placeholder="e.g. Lagos" value={loc.city} onChange={(e) => setLoc({ ...loc, city: e.target.value, manual: true })} />
        </div>
        <Toggle checked={loc.abroad} onChange={(abroad) => setLoc({ ...loc, abroad })} disabled={!loc.country}>
          Include jobs outside {name || "my country"}
        </Toggle>
        {loc.country && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              [counts.local, `In ${name.length > 9 ? "country" : name}`],
              [counts.remote, "Remote"],
              [counts.abroad, "Abroad"],
            ].map(([n, l]) => (
              <div key={l as string} className="rounded-xl bg-surface-2 px-1 py-2">
                <p className="text-lg font-semibold tabular-nums leading-tight">{n}</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{l}</p>
              </div>
            ))}
          </div>
        )}
        {noLocal && !hasLocalKey && (
          <p className="rounded-xl bg-accent-soft px-3 py-2 text-xs leading-relaxed">
            No on-site jobs in {name} yet. The free remote boards rarely list them. Add a free Jooble or Adzuna key to get local listings (see the README).
          </p>
        )}
      </div>
    </section>
  );
}
