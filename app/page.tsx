"use client";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_LOC, SAMPLE_CV, getSeen, markSeen, useDebounced, useLocalStorage, type Loc, type Stage, type Tracked } from "@/lib/client";
import { countryByCode, countryName, detectCountry } from "@/lib/geo";
import { haystack } from "@/lib/search";
import type { Profile, ScoredJob, SearchResponse, UserLocation } from "@/lib/types";
import Filters, { applyFilters, activeFilterCount, DEFAULT_FILTERS, DEFAULT_SAVED, type FilterState, type SavedFilters } from "./components/Filters";
import Header, { type Tab } from "./components/Header";
import JobCard from "./components/JobCard";
import JobDrawer from "./components/JobDrawer";
import Landing from "./components/Landing";
import LocationPanel from "./components/LocationPanel";
import ProfilePanel from "./components/ProfilePanel";
import Shortcuts from "./components/Shortcuts";
import Tracker from "./components/Tracker";

const PAGE = 20;

type AiProfile = Required<Pick<Profile, "skills" | "titles" | "years" | "level" | "summary" | "strengths">> & { country: string; city: string };

/** Combine the quick local read of the CV with the AI's read. The AI's roles win, skills are merged. */
function mergeProfile(base: Profile, a: AiProfile): Profile {
  const seen = new Set<string>();
  const skills = [...a.skills, ...base.skills].filter((s) => {
    const k = s.toLowerCase();
    return seen.has(k) ? false : (seen.add(k), true);
  });
  return {
    skills: skills.slice(0, 60),
    titles: (a.titles.length ? a.titles : base.titles).slice(0, 6),
    years: a.years ?? base.years,
    level: a.level ?? base.level,
    summary: a.summary || undefined,
    strengths: a.strengths,
  };
}

export default function Home() {
  const [profile, setProfile, ready] = useLocalStorage<Profile | null>("cvt:profile", null);
  const [cvText, setCvText] = useLocalStorage<string>("cvt:cv", "");
  const [loc, setLoc, locReady] = useLocalStorage<Loc>("cvt:loc", DEFAULT_LOC);
  const [tracked, setTracked] = useLocalStorage<Record<string, Tracked>>("cvt:tracked", {});
  const [hiddenIds, setHiddenIds] = useLocalStorage<string[]>("cvt:hidden", []);
  const [theme, setTheme] = useState("light");
  const [tab, setTab] = useState<Tab>("discover");

  const [data, setData] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useLocalStorage<SavedFilters>("cvt:filters", DEFAULT_SAVED);
  const [q, setQ] = useState("");
  const [onlyNew, setOnlyNew] = useState(false);
  const filters: FilterState = useMemo(() => ({ ...DEFAULT_FILTERS, ...saved, q, onlyNew }), [saved, q, onlyNew]);
  const setFilters = useCallback(
    (f: FilterState) => {
      const { q: nq, onlyNew: nn, ...rest } = f;
      setQ(nq);
      setOnlyNew(nn);
      setSaved(rest);
    },
    [setSaved],
  );
  const dq = useDeferredValue(q);
  const [serverQuery, setServerQuery] = useState("");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [activeIdx, setActiveIdx] = useState(-1);
  const [help, setHelp] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [ai, setAi] = useState<{ enabled: boolean | null; providers: string[] }>({ enabled: null, providers: [] });
  const [aiReading, setAiReading] = useState(false);
  const [locSettled, setLocSettled] = useState(false);
  const searchBox = useRef<HTMLInputElement>(null);

  // Theme
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

  // Is an AI provider configured on the server?
  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((s) => setAi({ enabled: !!s.enabled, providers: s.providers ?? [] }))
      .catch(() => setAi({ enabled: false, providers: [] }));
  }, []);

  // Guess the country from the browser the first time (never overrides a choice the user made).
  useEffect(() => {
    if (!locReady) return;
    if (!loc.country && !loc.manual) {
      const c = detectCountry();
      if (c) setLoc((l) => ({ ...l, country: c }));
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocSettled(true);
    // run once after the stored location has loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locReady]);

  // Re-rank whenever the (debounced) profile or location changes. A sequence number drops stale responses.
  const seq = useRef(0);
  const query = useMemo(() => ({ profile, country: loc.country, city: loc.city, q: serverQuery }), [profile, loc.country, loc.city, serverQuery]);
  const debounced = useDebounced(query, 450);
  const runSearch = useCallback(async (p: Profile, where: UserLocation, boardQuery = "") => {
    const id = ++seq.current;
    setSearching(true);
    setError("");
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skills: p.skills, titles: p.titles, years: p.years, level: p.level, location: where, query: boardQuery }),
      });
      const json = await res.json();
      if (id !== seq.current) return;
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      // Flag jobs we have not shown this person before ("New since your last visit")
      const ids: string[] = (json.results as ScoredJob[]).map((j) => j.id);
      const seen = getSeen();
      const fresh = seen.size ? ids.filter((i) => !seen.has(i)) : [];
      markSeen(ids);
      if (fresh.length) setNewIds((prev) => new Set([...prev, ...fresh]));
      setData(json);
      setVisible(PAGE);
      setActiveIdx(-1);
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      if (id === seq.current) setSearching(false);
    }
  }, []);
  useEffect(() => {
    const p = debounced.profile;
    // Fetching from our own API when the profile or location changes is a legitimate effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ready && locSettled && p && (p.skills.length || p.titles.length || debounced.q)) runSearch(p, { country: debounced.country, city: debounced.city }, debounced.q);
  }, [debounced, ready, locSettled, runSearch]);

  // Optional AI read of the CV (needs a configured free provider)
  async function aiRead(text: string, base: Profile) {
    if (!text) return;
    setAiReading(true);
    setNotice("");
    try {
      const res = await fetch("/api/ai/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "AI couldn't read the CV");
      const a: AiProfile = json.profile;
      setProfile((prev) => mergeProfile(prev ?? base, a));
      if (a.country && countryByCode(a.country)) setLoc((l) => (l.manual ? l : { ...l, country: a.country, city: l.city || a.city }));
    } catch (e) {
      setNotice(`${e instanceof Error ? e.message : "AI couldn't read the CV"} Using the standard CV read instead.`);
    } finally {
      setAiReading(false);
    }
  }

  async function parse(body: BodyInit, headers?: HeadersInit) {
    setParsing(true);
    setError("");
    try {
      const res = await fetch("/api/parse", { method: "POST", body, headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't read that CV");
      if (!json.profile.skills.length && !json.profile.titles.length && !ai.enabled) {
        throw new Error("We couldn't find any skills or roles in that CV. Try pasting the text instead.");
      }
      setFilters(DEFAULT_FILTERS);
      setCvText(json.text ?? "");
      setProfile(json.profile);
      if (ai.enabled) aiRead(json.text ?? "", json.profile);
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
    setCvText("");
    setData(null);
    setError("");
    setNotice("");
    setSearching(false);
    setFilters({ ...DEFAULT_FILTERS, sort: saved.sort });
    setServerQuery("");
    setNewIds(new Set());
    setTab("discover");
  }

  // Tracker actions
  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 2500);
  };
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
  const addNote = (job: ScoredJob, text: string) => {
    setTracked((t) => {
      const now = new Date().toISOString();
      const ex = t[job.id];
      if (ex) return { ...t, [job.id]: { ...ex, note: ex.note ? `${ex.note}\n\n${text}` : text, updatedAt: now } };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { description, ...slim } = job;
      return { ...t, [job.id]: { job: slim, stage: "saved", note: text, savedAt: now, updatedAt: now } };
    });
    flash("Saved to this job's notes in the Tracker");
  };
  const patch = (id: string, p: Partial<Tracked>) =>
    setTracked((t) => (t[id] ? { ...t, [id]: { ...t[id], ...p, updatedAt: new Date().toISOString() } } : t));
  const setStage = (id: string, stage: Stage) => patch(id, { stage });
  const setNote = (id: string, note: string) => patch(id, { note });
  const setFollowUp = (id: string, followUp: string) => patch(id, { followUp: followUp || undefined });
  const removeTracked = (id: string) =>
    setTracked((t) => {
      const n = { ...t };
      delete n[id];
      return n;
    });
  const hide = (id: string) => setHiddenIds((h) => (h.includes(id) ? h : [...h, id]));

  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const hay = useMemo(() => new Map((data?.results ?? []).map((j) => [j.id, haystack(j)] as const)), [data]);
  const showAbroad = loc.abroad || !loc.country;
  const filtered = useMemo(
    () => (data ? applyFilters(data.results, { ...filters, q: dq }, hiddenSet, showAbroad, newIds, hay) : []),
    [data, filters, dq, hiddenSet, showAbroad, newIds, hay],
  );
  const newCount = useMemo(() => (data?.results ?? []).filter((j) => newIds.has(j.id) && (showAbroad || j.loc !== "abroad")).length, [data, newIds, showAbroad]);
  const terms = useMemo(
    () => [...dq.matchAll(/"([^"]+)"|(\S+)/g)].map((m) => m[1] ?? (m[2].startsWith("-") ? "" : m[2])).filter((t) => t.length > 1),
    [dq],
  );
  const shown = filtered.slice(0, visible);
  const active = activeIdx < shown.length ? activeIdx : -1;
  const counts = useMemo(() => {
    const c = { local: 0, remote: 0, abroad: 0 };
    for (const j of data?.results ?? []) c[j.loc]++;
    return c;
  }, [data]);
  const job = data?.results.find((j) => j.id === selected) ?? null;
  const hiddenInResults = data ? data.results.filter((j) => hiddenSet.has(j.id)).length : 0;
  const abroadHidden = !loc.abroad && !!loc.country ? data?.results.filter((j) => j.loc === "abroad" && !hiddenSet.has(j.id)).length ?? 0 : 0;
  const nFilters = activeFilterCount(filters);
  const home = countryName(loc.country);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable) return;
      if (selected || help || tab !== "discover" || !profile) return;
      if (e.key === "/") {
        e.preventDefault();
        searchBox.current?.focus();
      } else if (e.key === "?") {
        setHelp(true);
      } else if (e.key === "j" || e.key === "k") {
        e.preventDefault();
        setActiveIdx((i) => (e.key === "j" ? Math.min(i + 1, shown.length - 1) : Math.max(i - 1, 0)));
      } else if (active >= 0) {
        const j = shown[active];
        if (e.key === "Enter" || e.key === "o") setSelected(j.id);
        else if (e.key === "s") save(j);
        else if (e.key === "x") hide(j.id);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // save/hide only call state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, help, tab, profile, shown, active]);

  useEffect(() => {
    if (active >= 0) document.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  // Removable chips for every active filter
  const chips: { label: string; clear: () => void }[] = [];
  const upd = (patch: Partial<FilterState>) => setFilters({ ...filters, ...patch });
  if (filters.remote) chips.push({ label: "Remote only", clear: () => upd({ remote: false }) });
  if (filters.minScore) chips.push({ label: `${filters.minScore}%+ match`, clear: () => upd({ minScore: 0 }) });
  if (filters.posted) chips.push({ label: `Last ${filters.posted === 1 ? "24 hours" : filters.posted + " days"}`, clear: () => upd({ posted: 0 }) });
  if (filters.salaryOnly) chips.push({ label: "Salary listed", clear: () => upd({ salaryOnly: false }) });
  if (filters.onlyNew) chips.push({ label: "New only", clear: () => upd({ onlyNew: false }) });
  if (filters.location) chips.push({ label: `Location: ${filters.location}`, clear: () => upd({ location: "" }) });
  filters.levels.forEach((l) => chips.push({ label: ["Intern", "Junior", "Mid", "Senior", "Lead+"][l], clear: () => upd({ levels: filters.levels.filter((x) => x !== l) }) }));
  filters.sources.forEach((s) => chips.push({ label: s, clear: () => upd({ sources: filters.sources.filter((x) => x !== s) }) }));

  const trackedList = Object.values(tracked);

  return (
    <>
      <Header
        tab={tab}
        setTab={setTab}
        trackedCount={trackedList.length}
        hasProfile={!!profile}
        onReset={reset}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {tab === "tracker" ? (
        <Tracker items={trackedList} setStage={setStage} setNote={setNote} setFollowUp={setFollowUp} remove={removeTracked} goDiscover={() => setTab("discover")} />
      ) : !ready || !locReady ? null : !profile ? (
        <Landing
          busy={parsing}
          error={error}
          onFile={onFile}
          onText={onText}
          onSample={() => onText(SAMPLE_CV)}
          country={loc.country}
          onCountry={(country) => setLoc({ ...loc, country, manual: true })}
          aiEnabled={!!ai.enabled}
        />
      ) : (
        <main id="main" className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pb-4">
            <ProfilePanel
              profile={profile}
              onChange={setProfile}
              loading={searching && !!data}
              ai={{ available: !!ai.enabled && !!cvText, reading: aiReading, onRead: () => aiRead(cvText, profile) }}
            />
            <button className="btn w-full lg:hidden" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}>
              {showFilters ? "Hide location & filters" : `Location & filters${nFilters ? ` (${nFilters})` : ""}`}
            </button>
            <div className={`space-y-4 ${showFilters ? "block" : "hidden lg:block"}`}>
              <LocationPanel loc={loc} setLoc={setLoc} counts={counts} localSources={data?.localSources} loading={searching} />
              <div className="card p-4">
                <Filters f={filters} setF={setFilters} sources={data?.sources ?? {}} newCount={newCount} />
              </div>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && q.trim()) {
                    setServerQuery(q.trim());
                    setQ("");
                  } else if (e.key === "Escape") setQ("");
                }}
              />
            </div>
            {(serverQuery || (q.trim() && data && filtered.length < 8)) && (
              <div className="-mt-2 mb-4 flex flex-wrap items-center gap-2 text-sm">
                {serverQuery && (
                  <span className="chip chip-accent gap-1.5 !py-1">
                    Searching the job boards for &quot;{serverQuery}&quot;
                    <button className="cursor-pointer font-bold" onClick={() => setServerQuery("")} aria-label="Clear board search">
                      ✕
                    </button>
                  </span>
                )}
                {q.trim() && !serverQuery && (
                  <button
                    className="btn !py-1 text-xs"
                    onClick={() => {
                      setServerQuery(q.trim());
                      setQ("");
                    }}
                  >
                    Not finding it? Search the job boards for &quot;{q.trim()}&quot; ↵
                  </button>
                )}
              </div>
            )}
            {chips.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5" aria-label="Active filters">
                {chips.map((c) => (
                  <button key={c.label} className="chip chip-accent cursor-pointer gap-1 hover:opacity-80" onClick={c.clear} aria-label={`Remove filter ${c.label}`}>
                    {c.label} <span aria-hidden>✕</span>
                  </button>
                ))}
                <button className="text-xs font-medium text-muted hover:text-fg" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort, q })}>
                  Clear all
                </button>
              </div>
            )}

            {notice && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">
                {notice}
                <button className="btn !py-1" onClick={() => setNotice("")}>
                  Dismiss
                </button>
              </div>
            )}
            {error && (
              <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">
                {error}
                <button className="btn !py-1" onClick={() => runSearch(profile, { country: loc.country, city: loc.city }, serverQuery)}>
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
                    {hiddenInResults > 0 && (
                      <button className="ml-3 text-accent hover:underline" onClick={() => setHiddenIds([])}>
                        Restore {hiddenInResults} hidden
                      </button>
                    )}
                  </p>
                  {(searching || aiReading) && <span className="text-accent">{aiReading ? "AI reading your CV…" : "Updating…"}</span>}
                </div>

                {filtered.length === 0 ? (
                  <div className="card px-6 py-14 text-center">
                    <h3 className="font-semibold">No jobs match these filters</h3>
                    <p className="mt-1 text-sm text-muted">
                      {abroadHidden > 0 ? `There are ${abroadHidden} jobs outside ${home}. ` : ""}Try loosening the filters or adding more skills to your profile.
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                      {abroadHidden > 0 && (
                        <button className="btn btn-primary" onClick={() => setLoc({ ...loc, abroad: true })}>
                          Show jobs outside {home}
                        </button>
                      )}
                      {nFilters > 0 && (
                        <button className="btn" onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}>
                          Reset filters
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {shown.map((j, i) => (
                      <li key={j.id}>
                        <JobCard job={j} home={loc.country} terms={terms} isNew={newIds.has(j.id)} active={i === active} index={i} stage={tracked[j.id]?.stage} onOpen={() => setSelected(j.id)} onSave={() => save(j)} onHide={() => hide(j.id)} />
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
                  <br />
                  <button className="mt-1 text-accent hover:underline" onClick={() => setHelp(true)}>
                    Keyboard shortcuts &amp; search tips (?)
                  </button>
                </p>
              </>
            )}
          </section>
        </main>
      )}

      {job && tab === "discover" && (
        <JobDrawer
          job={job}
          home={loc.country}
          cv={cvText}
          ai={ai}
          stage={tracked[job.id]?.stage}
          onClose={() => setSelected(null)}
          onSave={() => save(job)}
          onStage={(s) => setStage(job.id, s)}
          onHide={() => hide(job.id)}
          onSaveNote={(text) => addNote(job, text)}
        />
      )}

      {help && <Shortcuts onClose={() => setHelp(false)} />}

      {toast && (
        <div role="status" className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-fg px-4 py-2 text-sm text-bg shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
