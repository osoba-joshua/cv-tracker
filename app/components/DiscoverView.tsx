"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flame, Inbox, Search, SlidersHorizontal, Sparkles, Target, X, Zap } from "lucide-react";
import { ageDays } from "@/lib/client";
import { countryName } from "@/lib/geo";
import { usePath } from "@/lib/nav";
import { useApp } from "@/lib/store";
import type { ScoredJob } from "@/lib/types";
import { DEFAULT_FILTERS } from "./Filters";
import Filters from "./Filters";
import GettingStarted from "./GettingStarted";
import JobCard from "./JobCard";
import Landing from "./Landing";
import LocationPanel from "./LocationPanel";
import ProfilePanel from "./ProfilePanel";
import SavedSearches from "./SavedSearches";
import Sheet from "./Sheet";

const PAGE = 20;

function SkeletonList() {
  return (
    <div className="space-y-3" aria-label="Loading jobs">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card flex gap-3.5 p-4">
          <div className="skeleton h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2.5">
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="flex gap-2">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function Stat({ icon: Icon, label, value, onClick, active }: { icon: typeof Zap; label: string; value: number | string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`card card-hover flex items-center gap-3 px-3.5 py-3 text-left ${active ? "!border-accent !bg-accent-soft" : ""} ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <Icon size={17} />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-semibold leading-tight tabular-nums">{value}</span>
        <span className="block truncate text-xs text-muted">{label}</span>
      </span>
    </button>
  );
}

function Results() {
  const app = useApp();
  const {
    data, searching, searchError, retry, filtered, filters, setFilters, filterCount, counts, newCount, newIds, terms, showAbroad, loc, setLoc,
    serverQuery, setServerQuery, tracked, settings, notice, dismissNotice, aiReading, hiddenIds, restoreHidden, setHelpOpen, helpOpen, selected,
    save, hide, openJob, paletteOpen,
  } = app;
  const onDiscover = usePath() === "/";
  const [visible, setVisible] = useState(PAGE);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [sheet, setSheet] = useState(false);
  const searchBox = useRef<HTMLInputElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const home = countryName(loc.country);
  const compact = settings.density === "compact";

  // Back to the top of the list whenever the result set changes
  const resultKey = `${data?.total}-${filtered.length}-${filters.sort}`;
  const lastKey = useRef(resultKey);
  useEffect(() => {
    if (lastKey.current !== resultKey) {
      lastKey.current = resultKey;
      setVisible(PAGE);
      setActiveIdx(-1);
    }
  }, [resultKey]);

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);
  const active = activeIdx < shown.length ? activeIdx : -1;

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el || visible >= filtered.length) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible((v) => v + PAGE), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible, filtered.length]);

  // Keyboard navigation (j/k, Enter, s, x, /, ?)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable) return;
      if (!onDiscover || selected || helpOpen || paletteOpen) return;
      if (e.key === "/") {
        e.preventDefault();
        searchBox.current?.focus();
      } else if (e.key === "?") {
        setHelpOpen(true);
      } else if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        setActiveIdx((i) => (e.key === "j" ? Math.min(i + 1, shown.length - 1) : Math.max(i - 1, 0)));
      } else if (active >= 0) {
        const j = shown[active];
        if (e.key === "Enter" || e.key === "o") openJob(j.id);
        else if (e.key === "s") save(j);
        else if (e.key === "x") hide(j.id);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDiscover, selected, helpOpen, paletteOpen, shown, active, save, hide, openJob, setHelpOpen]);
  useEffect(() => {
    if (active >= 0) document.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onOpen = useCallback((id: string) => openJob(id), [openJob]);

  // Removable chips for every active filter
  const chips: { label: string; clear: () => void }[] = [];
  const upd = (patch: Partial<typeof filters>) => setFilters({ ...filters, ...patch });
  if (filters.remote) chips.push({ label: "Remote only", clear: () => upd({ remote: false }) });
  if (filters.minScore) chips.push({ label: `${filters.minScore}%+ match`, clear: () => upd({ minScore: 0 }) });
  if (filters.posted) chips.push({ label: `Last ${filters.posted === 1 ? "24 hours" : filters.posted + " days"}`, clear: () => upd({ posted: 0 }) });
  if (filters.salaryOnly) chips.push({ label: "Salary listed", clear: () => upd({ salaryOnly: false }) });
  if (filters.onlyNew) chips.push({ label: "New only", clear: () => upd({ onlyNew: false }) });
  if (filters.location) chips.push({ label: `Location: ${filters.location}`, clear: () => upd({ location: "" }) });
  filters.levels.forEach((l) => chips.push({ label: ["Intern", "Junior", "Mid", "Senior", "Lead+"][l], clear: () => upd({ levels: filters.levels.filter((x) => x !== l) }) }));
  filters.sources.forEach((s) => chips.push({ label: s, clear: () => upd({ sources: filters.sources.filter((x) => x !== s) }) }));

  const abroadHidden = !showAbroad ? data?.results.filter((j) => j.loc === "abroad" && !app.hiddenSet.has(j.id)).length ?? 0 : 0;
  const strong = filtered.filter((j) => j.score >= 65).length;
  const panels = (
    <>
      <ProfilePanel idSuffix="-sheet" defaultOpen={false} />
      <LocationPanel />
      <div className="card p-4">
        <Filters f={filters} setF={setFilters} sources={data?.sources ?? {}} newCount={newCount} />
      </div>
    </>
  );

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pb-4">
        <ProfilePanel />
        <LocationPanel />
        <div className="card p-4">
          <Filters f={filters} setF={setFilters} sources={data?.sources ?? {}} newCount={newCount} />
        </div>
      </aside>

      <section aria-live="polite" className="min-w-0">
        <h1 className="sr-only">Jobs matched to your CV</h1>
        <GettingStarted />
        {/* quick stats */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Target} label="Jobs for you" value={data ? filtered.length : "–"} />
          <Stat icon={Zap} label="Strong fits" value={data ? strong : "–"} onClick={() => upd({ minScore: filters.minScore === 65 ? 0 : 65 })} active={filters.minScore === 65} />
          <Stat icon={Sparkles} label="New for you" value={data ? newCount : "–"} onClick={newCount ? () => upd({ onlyNew: !filters.onlyNew }) : undefined} active={filters.onlyNew} />
          <Stat icon={Flame} label="Posted today" value={data ? filtered.filter((j) => ageDays(j.postedAt) < 1).length : "–"} onClick={() => upd({ posted: filters.posted === 1 ? 0 : 1 })} active={filters.posted === 1} />
        </div>

        {/* search row */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              ref={searchBox}
              className="input !h-10 !pl-10"
              placeholder="Search title, company or skill…"
              aria-label="Search results"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filters.q.trim()) {
                  setServerQuery(filters.q.trim());
                  setFilters({ ...filters, q: "" });
                } else if (e.key === "Escape") setFilters({ ...filters, q: "" });
              }}
            />
            {filters.q ? (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-muted hover:text-fg" onClick={() => setFilters({ ...filters, q: "" })} aria-label="Clear search">
                <X size={15} />
              </button>
            ) : (
              <span className="kbd absolute right-3 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</span>
            )}
          </div>
          <button className="btn lg:hidden" onClick={() => setSheet(true)} aria-label="Open filters">
            <SlidersHorizontal size={15} />
            {filterCount > 0 && <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg">{filterCount}</span>}
          </button>
          <SavedSearches />
        </div>

        {(serverQuery || (filters.q.trim() && data && filtered.length < 8)) && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            {serverQuery && (
              <span className="chip chip-accent gap-1.5 !py-1">
                Searching the job boards for &quot;{serverQuery}&quot;
                <button className="cursor-pointer" onClick={() => setServerQuery("")} aria-label="Clear board search">
                  <X size={13} strokeWidth={3} />
                </button>
              </span>
            )}
            {filters.q.trim() && !serverQuery && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  setServerQuery(filters.q.trim());
                  setFilters({ ...filters, q: "" });
                }}
              >
                <Search size={13} /> Not finding it? Search the job boards for &quot;{filters.q.trim()}&quot; ↵
              </button>
            )}
          </div>
        )}

        {chips.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5" aria-label="Active filters">
            {chips.map((c) => (
              <button key={c.label} className="chip chip-accent cursor-pointer gap-1 transition-opacity hover:opacity-80" onClick={c.clear} aria-label={`Remove filter ${c.label}`}>
                {c.label} <X size={11} strokeWidth={3} />
              </button>
            ))}
            <button className="px-1 text-xs font-medium text-muted hover:text-fg" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort, q: filters.q })}>
              Clear all
            </button>
          </div>
        )}

        {notice && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
            {notice}
            <button className="btn btn-sm" onClick={dismissNotice}>
              Dismiss
            </button>
          </div>
        )}
        {searchError && (
          <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
            {searchError}
            <button className="btn btn-sm" onClick={retry}>
              Retry
            </button>
          </div>
        )}

        {!data && searching && <SkeletonList />}

        {data && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
              <p>
                <strong className="text-fg">{filtered.length}</strong> matching jobs
                <span className="hidden sm:inline"> from {data.total.toLocaleString()} scanned</span>
                {abroadHidden > 0 && (
                  <button className="ml-3 text-accent hover:underline" onClick={() => setLoc({ ...loc, abroad: true })}>
                    + {abroadHidden} outside {home}
                  </button>
                )}
                {loc.abroad && !!loc.country && counts.abroad > 0 && (
                  <button className="ml-3 text-accent hover:underline" onClick={() => setLoc({ ...loc, abroad: false })}>
                    Hide jobs outside {home}
                  </button>
                )}
                {hiddenIds.length > 0 && (
                  <button className="ml-3 text-accent hover:underline" onClick={restoreHidden}>
                    Restore {hiddenIds.length} hidden
                  </button>
                )}
              </p>
              {(searching || aiReading) && <span className="text-accent">{aiReading ? "AI reading your CV…" : "Updating…"}</span>}
            </div>

            {filtered.length === 0 ? (
              <div className="card px-6 py-16 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-muted"><Inbox size={22} /></span>
                <h3 className="mt-4 font-semibold">No jobs match these filters</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                  {abroadHidden > 0 ? `There are ${abroadHidden} jobs outside ${home}. ` : ""}Try loosening the filters or adding more skills to your profile.
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  {abroadHidden > 0 && (
                    <button className="btn btn-primary" onClick={() => setLoc({ ...loc, abroad: true })}>
                      Show jobs outside {home}
                    </button>
                  )}
                  {filterCount > 0 && (
                    <button className="btn" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}>
                      Reset filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <ul className="space-y-3" style={{ gap: "var(--gap)" }}>
                {shown.map((j: ScoredJob, i: number) => (
                  <li key={j.id} className="reveal" style={{ animationDelay: `${Math.min(i, 8) * 25}ms` }}>
                    <JobCard
                      job={j}
                      home={loc.country}
                      terms={terms}
                      isNew={newIds.has(j.id)}
                      active={i === active}
                      index={i}
                      stage={tracked[j.id]?.stage}
                      compact={compact}
                      onOpen={onOpen}
                      onSave={save}
                      onHide={hide}
                    />
                  </li>
                ))}
              </ul>
            )}

            {filtered.length > visible && (
              <div ref={sentinel} className="mt-5 text-center">
                <button className="btn" onClick={() => setVisible((v) => v + PAGE)}>
                  Show {Math.min(PAGE, filtered.length - visible)} more
                </button>
              </div>
            )}

            <p className="mt-10 text-center text-xs leading-relaxed text-muted">
              Listings from {Object.keys(data.sources).join(", ")}. Every job links to its original posting. Refreshed hourly.
              <br />
              <button className="mt-1 text-accent hover:underline" onClick={() => setHelpOpen(true)}>
                Keyboard shortcuts &amp; search tips (?)
              </button>
            </p>
          </>
        )}
      </section>

      {sheet && (
        <Sheet
          title="Profile, location & filters"
          onClose={() => setSheet(false)}
          footer={
            <button className="btn btn-primary btn-lg w-full" onClick={() => setSheet(false)}>
              Show {filtered.length} jobs
            </button>
          }
        >
          {panels}
        </Sheet>
      )}
    </main>
  );
}

export default function DiscoverView() {
  const { ready, profile } = useApp();
  if (!ready) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <SkeletonList />
      </div>
    );
  }
  if (!profile) return <Landing />;
  return <Results />;
}
