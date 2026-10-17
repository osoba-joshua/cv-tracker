"use client";
import { ageDays } from "@/lib/client";
import { LEVEL_NAMES, type ScoredJob } from "@/lib/types";

export type FilterState = {
  q: string;
  remote: boolean;
  minScore: number;
  sources: string[]; // empty = all
  posted: 0 | 1 | 7 | 30; // 0 = any
  salaryOnly: boolean;
  levels: number[]; // empty = all
  location: string;
  sort: "match" | "newest" | "salary";
};

export const DEFAULT_FILTERS: FilterState = {
  q: "",
  remote: false,
  minScore: 0,
  sources: [],
  posted: 0,
  salaryOnly: false,
  levels: [],
  location: "",
  sort: "match",
};

export function activeFilterCount(f: FilterState) {
  return (
    (f.q ? 1 : 0) + (f.remote ? 1 : 0) + (f.minScore ? 1 : 0) + (f.sources.length ? 1 : 0) +
    (f.posted ? 1 : 0) + (f.salaryOnly ? 1 : 0) + (f.levels.length ? 1 : 0) + (f.location ? 1 : 0)
  );
}

export function applyFilters(jobs: ScoredJob[], f: FilterState, hidden: Set<string>): ScoredJob[] {
  const q = f.q.trim().toLowerCase();
  const loc = f.location.trim().toLowerCase();
  const out = jobs.filter((j) => {
    if (hidden.has(j.id)) return false;
    if (f.remote && !j.remote) return false;
    if (j.score < f.minScore) return false;
    if (f.sources.length && !f.sources.includes(j.source)) return false;
    if (f.posted && ageDays(j.postedAt) > f.posted) return false;
    if (f.salaryOnly && !j.salary) return false;
    if (f.levels.length && !(j.level !== undefined ? f.levels.includes(j.level) : f.levels.includes(2))) return false;
    if (loc && !j.location.toLowerCase().includes(loc)) return false;
    if (q && !`${j.title} ${j.company} ${j.tags.join(" ")}`.toLowerCase().includes(q)) return false;
    return true;
  });
  if (f.sort === "newest") out.sort((a, b) => +new Date(b.postedAt ?? 0) - +new Date(a.postedAt ?? 0));
  else if (f.sort === "salary") out.sort((a, b) => (b.salaryMax ?? 0) - (a.salaryMax ?? 0));
  return out; // "match" order is already the server's order
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{children}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${checked ? "bg-accent" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export default function Filters({
  f,
  setF,
  sources,
}: {
  f: FilterState;
  setF: (f: FilterState) => void;
  sources: Record<string, number>;
}) {
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) => setF({ ...f, [k]: v });
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const n = activeFilterCount(f);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Filters</h2>
        {n > 0 && (
          <button className="text-xs font-medium text-accent hover:underline" onClick={() => setF({ ...DEFAULT_FILTERS, sort: f.sort })}>
            Reset ({n})
          </button>
        )}
      </div>

      <div>
        <label className="label" htmlFor="sort">
          Sort by
        </label>
        <select id="sort" className="input" value={f.sort} onChange={(e) => set("sort", e.target.value as FilterState["sort"])}>
          <option value="match">Best match</option>
          <option value="newest">Newest</option>
          <option value="salary">Highest salary</option>
        </select>
      </div>

      <div>
        <span className="label">Minimum match</span>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-bg p-1" role="radiogroup" aria-label="Minimum match">
          {[
            [0, "Any"],
            [45, "45%+"],
            [65, "65%+"],
          ].map(([v, l]) => (
            <button
              key={v}
              role="radio"
              aria-checked={f.minScore === v}
              onClick={() => set("minScore", v as number)}
              className={`cursor-pointer rounded-md py-1.5 text-xs font-medium ${f.minScore === v ? "bg-card text-fg shadow-sm" : "text-muted"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Toggle checked={f.remote} onChange={(v) => set("remote", v)}>
          Remote only
        </Toggle>
        <Toggle checked={f.salaryOnly} onChange={(v) => set("salaryOnly", v)}>
          Salary listed
        </Toggle>
      </div>

      <div>
        <label className="label" htmlFor="posted">
          Posted
        </label>
        <select id="posted" className="input" value={f.posted} onChange={(e) => set("posted", Number(e.target.value) as FilterState["posted"])}>
          <option value={0}>Any time</option>
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="loc">
          Location contains
        </label>
        <input id="loc" className="input" placeholder="e.g. Europe, USA, Berlin" value={f.location} onChange={(e) => set("location", e.target.value)} />
      </div>

      <div>
        <span className="label">Level</span>
        <div className="flex flex-wrap gap-1.5">
          {LEVEL_NAMES.map((name, i) => (
            <button
              key={name}
              aria-pressed={f.levels.includes(i)}
              onClick={() => set("levels", toggle(f.levels, i))}
              className={`chip cursor-pointer ${f.levels.includes(i) ? "chip-accent" : "hover:bg-accent-soft"}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Source</span>
        <div className="space-y-1.5">
          {Object.entries(sources).map(([name, count]) => (
            <label key={name} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--accent)]"
                checked={f.sources.includes(name)}
                onChange={() => set("sources", toggle(f.sources, name))}
              />
              {name}
              <span className="ml-auto text-xs text-muted">{count}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
