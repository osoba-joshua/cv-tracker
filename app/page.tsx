"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SAMPLE_CV, useDebounced, useLocalStorage, type Stage, type Tracked } from "@/lib/client";
import type { Profile, ScoredJob, SearchResponse } from "@/lib/types";
import Filters, { applyFilters, activeFilterCount, DEFAULT_FILTERS, type FilterState } from "./components/Filters";
import Header, { type Tab } from "./components/Header";
import JobCard from "./components/JobCard";
import JobDrawer from "./components/JobDrawer";
import Landing from "./components/Landing";
import ProfilePanel from "./components/ProfilePanel";
import Tracker from "./components/Tracker";

const PAGE = 20;

export default function Home() {
  const [profile, setProfile, ready] = useLocalStorage<Profile | null>("cvt:profile", null);
  const [tracked, setTracked] = useLocalStorage<Record<string, Tracked>>("cvt:tracked", {});
  const [hiddenIds, setHiddenIds] = useLocalStorage<string[]>("cvt:hidden", []);
  const [theme, setTheme] = useState("light");
  const [tab, setTab] = useState<Tab>("discover");

  const [data, setData] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const searchBox = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme ?? "light");
  }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("cvt:theme", next);
    } catch {}
  };

  // Re-rank whenever the (debounced) profile changes. A sequence number drops stale responses.
  const seq = useRef(0);
  const debounced = useDebounced(profile, 450);
  const runSearch = useCallback(async (p: Profile) => {
    const id = ++seq.current;
    setSearching(true);
    setError("");
    try {
      const res = await fetch("/api/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p) });
      const json = await res.json();
      if (id !== seq.current) return;
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      setData(json);
      setVisible(PAGE);
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      if (id === seq.current) setSearching(false);
    }
  }, []);
  useEffect(() => {
    // Fetching from our own API when the profile changes is a legitimate effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready && debounced && (debounced.skills.length || debounced.titles.length)) runSearch(debounced);
  }, [debounced, ready, runSearch]);

  async function parse(body: BodyInit, headers?: HeadersInit) {
    setParsing(true);
    setError("");
    try {
      const res = await fetch("/api/parse", { method: "POST", body, headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't read that CV");
      if (!json.profile.skills.length && !json.profile.titles.length) {
        throw new Error("We couldn't find any skills or roles in that CV. Try pasting the text instead.");
      }
      setFilters(DEFAULT_FILTERS);
      setProfile(json.profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setParsing(false);
    }
  }
  const onFile = (f: File) => {
    const fd = new FormData();
    fd.append("cv", f);
    parse(fd);
  };
  const onText = (text: string) => parse(JSON.stringify({ text }), { "content-type": "application/json" });

  function reset() {
    seq.current++;
    setProfile(null);
    setData(null);
    setError("");
    setSearching(false);
    setFilters(DEFAULT_FILTERS);
    setTab("discover");
  }

  // Tracker actions
  const save = (job: ScoredJob) =>
    setTracked((t) => {
      const next = { ...t };
      if (next[job.id]) delete next[job.id];
      else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { description, ...slim } = job;
        const now = new Date().toISOString();
        next[job.id] = { job: slim, stage: "saved", note: "", savedAt: now, updatedAt: now };
      }
      return next;
    });
  const setStage = (id: string, stage: Stage) =>
    setTracked((t) => (t[id] ? { ...t, [id]: { ...t[id], stage, updatedAt: new Date().toISOString() } } : t));
  const setNote = (id: string, note: string) => setTracked((t) => (t[id] ? { ...t, [id]: { ...t[id], note } } : t));
  const removeTracked = (id: string) =>
    setTracked((t) => {
      const n = { ...t };
      delete n[id];
      return n;
    });
  const hide = (id: string) => setHiddenIds((h) => (h.includes(id) ? h : [...h, id]));

  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const filtered = useMemo(() => (data ? applyFilters(data.results, filters, hiddenSet) : []), [data, filters, hiddenSet]);
  const job = data?.results.find((j) => j.id === selected) ?? null;
  const hiddenInResults = data ? data.results.filter((j) => hiddenSet.has(j.id)).length : 0;
  const nFilters = activeFilterCount(filters);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(t.tagName)) {
        e.preventDefault();
        searchBox.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const trackedList = Object.values(tracked);
  const inResultsView = !!profile;

  return (
    <>
      <Header
        tab={tab}
        setTab={setTab}
        trackedCount={trackedList.length}
        hasProfile={inResultsView}
        onReset={reset}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {tab === "tracker" ? (
        <Tracker items={trackedList} setStage={setStage} setNote={setNote} remove={removeTracked} goDiscover={() => setTab("discover")} />
      ) : !ready ? null : !profile ? (
        <Landing busy={parsing} error={error} onFile={onFile} onText={onText} onSample={() => onText(SAMPLE_CV)} />
      ) : (
        <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pb-4">
            <ProfilePanel profile={profile} onChange={setProfile} loading={searching && !!data} />
            <button className="btn w-full lg:hidden" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}>
              {showFilters ? "Hide filters" : `Filters${nFilters ? ` (${nFilters})` : ""}`}
            </button>
            <div className={`card p-4 ${showFilters ? "block" : "hidden lg:block"}`}>
              <Filters f={filters} setF={setFilters} sources={data?.sources ?? {}} />
            </div>
          </aside>

          <section aria-live="polite">
            <div className="relative mb-4">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                ref={searchBox}
                className="input !pl-9"
                placeholder="Search title, company or tag…   ( / )"
                aria-label="Search results"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />
            </div>

            {error && (
              <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">
                {error}
                <button className="btn !py-1" onClick={() => runSearch(profile)}>
                  Retry
                </button>
              </div>
            )}

            {!data && searching && (
              <div className="space-y-3" aria-label="Loading jobs">
                <p className="text-sm text-muted">Scanning live job postings…</p>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="card flex gap-3 p-4">
                    <div className="skeleton h-11 w-11 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-2/3 rounded" />
                      <div className="skeleton h-3 w-1/3 rounded" />
                      <div className="skeleton h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data && (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
                  <p>
                    <strong className="text-fg">{filtered.length}</strong> matching jobs
                    <span className="hidden sm:inline"> from {data.total.toLocaleString()} scanned</span>
                    {hiddenInResults > 0 && (
                      <button className="ml-3 text-accent hover:underline" onClick={() => setHiddenIds([])}>
                        Restore {hiddenInResults} hidden
                      </button>
                    )}
                  </p>
                  {searching && <span className="text-accent">Updating…</span>}
                </div>

                {filtered.length === 0 ? (
                  <div className="card px-6 py-14 text-center">
                    <h3 className="font-semibold">No jobs match these filters</h3>
                    <p className="mt-1 text-sm text-muted">Try loosening the filters or adding more skills to your profile.</p>
                    {nFilters > 0 && (
                      <button className="btn mt-4" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}>
                        Reset filters
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {filtered.slice(0, visible).map((j) => (
                      <li key={j.id}>
                        <JobCard job={j} stage={tracked[j.id]?.stage} onOpen={() => setSelected(j.id)} onSave={() => save(j)} onHide={() => hide(j.id)} />
                      </li>
                    ))}
                  </ul>
                )}

                {filtered.length > visible && (
                  <div className="mt-5 text-center">
                    <button className="btn" onClick={() => setVisible(visible + PAGE)}>
                      Show {Math.min(PAGE, filtered.length - visible)} more
                    </button>
                  </div>
                )}

                <p className="mt-10 text-center text-xs text-muted">
                  Listings from{" "}
                  {Object.keys(data.sources).map((s, i, a) => (
                    <span key={s}>
                      {s}
                      {i < a.length - 1 ? ", " : ""}
                    </span>
                  ))}
                  . Every job links to its original posting. Refreshed hourly.
                </p>
              </>
            )}
          </section>
        </main>
      )}

      {job && tab === "discover" && (
        <JobDrawer
          job={job}
          stage={tracked[job.id]?.stage}
          onClose={() => setSelected(null)}
          onSave={() => save(job)}
          onStage={(s) => setStage(job.id, s)}
          onHide={() => hide(job.id)}
        />
      )}
    </>
  );
}
