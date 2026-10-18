"use client";
import { createContext, useCallback, useContext, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DEFAULT_LOC, SAMPLE_CV, getSeen, markSeen, useDebounced, useLocalStorage,
  type Loc, type Stage, type Tracked,
} from "./client";
import { confetti } from "./confetti";
import { countryByCode, detectCountry } from "./geo";
import { haystack } from "./search";
import { DEFAULT_SETTINGS, SETTINGS_KEY, applySettings, resolveTheme, type Settings } from "./settings";
import type { Profile, ScoredJob, SearchResponse, UserLocation } from "./types";
import {
  DEFAULT_FILTERS, DEFAULT_SAVED, activeFilterCount, applyFilters, type FilterState, type SavedFilters,
} from "@/app/components/Filters";

export type Toast = {
  id: number;
  message: string;
  tone: "default" | "success" | "error";
  action?: { label: string; run: () => void };
};

export type Onboarding = { dismissed: boolean; insights: boolean; cv: boolean };

export type SavedSearch = {
  id: string;
  name: string;
  query: string; // the job-board search, if any
  q: string; // the in-results search text
  filters: SavedFilters;
  onlyNew: boolean;
};

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

type Ctx = {
  ready: boolean;
  settings: Settings;
  setSettings: (s: Settings | ((p: Settings) => Settings)) => void;
  /** Resolved theme. Safe to render: it is "light" until after hydration, then follows the real theme. */
  dark: boolean;

  // CV + profile
  profile: Profile | null;
  setProfile: (p: Profile | null | ((p: Profile | null) => Profile | null)) => void;
  cvText: string;
  parsing: boolean;
  parseError: string;
  notice: string;
  dismissNotice: () => void;
  onFile: (f: File) => void;
  onText: (t: string) => void;
  loadSample: () => void;
  reset: () => void;
  aiReading: boolean;
  aiRead: () => void;
  ai: { enabled: boolean | null; providers: string[] };

  // location
  loc: Loc;
  setLoc: (l: Loc | ((p: Loc) => Loc)) => void;

  // search
  data: SearchResponse | null;
  searching: boolean;
  searchError: string;
  retry: () => void;
  serverQuery: string;
  setServerQuery: (q: string) => void;

  // filters
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  filterCount: number;
  filtered: ScoredJob[];
  counts: { local: number; remote: number; abroad: number };
  newIds: Set<string>;
  newCount: number;
  terms: string[];
  showAbroad: boolean;

  // jobs
  hiddenIds: string[];
  hiddenSet: Set<string>;
  hide: (id: string) => void;
  restoreHidden: () => void;

  // tracker
  tracked: Record<string, Tracked>;
  trackedList: Tracked[];
  save: (job: ScoredJob) => void;
  addNote: (job: ScoredJob, text: string) => void;
  setStage: (id: string, stage: Stage) => void;
  setNote: (id: string, note: string) => void;
  setFollowUp: (id: string, date: string) => void;
  removeTracked: (id: string) => void;

  // saved searches
  searches: SavedSearch[];
  saveSearch: (name: string) => void;
  deleteSearch: (id: string) => void;
  applySearch: (s: SavedSearch) => void;

  // getting-started checklist
  onboarding: Onboarding;
  markVisited: (what: "insights" | "cv") => void;
  dismissOnboarding: () => void;

  // UI
  selected: ScoredJob | null;
  openJob: (id: string) => void;
  closeJob: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
  toasts: Toast[];
  toast: (message: string, opts?: { tone?: Toast["tone"]; action?: Toast["action"] }) => void;
  dismissToast: (id: number) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp must be used inside <AppProvider>");
  return c;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useLocalStorage<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS);
  const [profile, setProfile] = useLocalStorage<Profile | null>("cvt:profile", null);
  const [cvText, setCvText] = useLocalStorage<string>("cvt:cv", "");
  const [loc, setLoc, locReady] = useLocalStorage<Loc>("cvt:loc", DEFAULT_LOC);
  const [tracked, setTracked] = useLocalStorage<Record<string, Tracked>>("cvt:tracked", {});
  const [hiddenIds, setHiddenIds] = useLocalStorage<string[]>("cvt:hidden", []);
  const [saved, setSaved] = useLocalStorage<SavedFilters>("cvt:filters", DEFAULT_SAVED);
  const [searches, setSearches] = useLocalStorage<SavedSearch[]>("cvt:searches", []);
  const [onboarding, setOnboarding] = useLocalStorage<Onboarding>("cvt:onboarding", { dismissed: false, insights: false, cv: false });

  const [q, setQ] = useState("");
  const [onlyNew, setOnlyNew] = useState(false);
  const [serverQuery, setServerQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [notice, setNotice] = useState("");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [ai, setAi] = useState<{ enabled: boolean | null; providers: string[] }>({ enabled: null, providers: [] });
  const [aiReading, setAiReading] = useState(false);
  const [locSettled, setLocSettled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);
  const ready = hydrated && locReady;

  // ---- settings -> <html> attributes (and follow the OS theme when set to "system")
  useEffect(() => {
    applySettings(settings);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(resolveTheme(settings.theme) === "dark");
    if (settings.theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => {
      applySettings(settings);
      setDark(mq.matches);
    };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [settings]);

  // ---- toasts
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback<Ctx["toast"]>(
    (message, opts) => {
      const id = ++toastId.current;
      setToasts((t) => [...t.slice(-2), { id, message, tone: opts?.tone ?? "default", action: opts?.action }]);
      setTimeout(() => dismissToast(id), opts?.action ? 6000 : 3200);
    },
    [dismissToast],
  );

  // ---- is an AI provider configured on the server?
  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((s) => setAi({ enabled: !!s.enabled, providers: s.providers ?? [] }))
      .catch(() => setAi({ enabled: false, providers: [] }));
  }, []);

  // ---- guess the country from the browser the first time (never overrides a choice the user made)
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

  // ---- filters: some are remembered, search text and "new only" are per visit
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

  // ---- searching: re-rank whenever the (debounced) profile, location or board query changes
  const seq = useRef(0);
  const query = useMemo(() => ({ profile, country: loc.country, city: loc.city, q: serverQuery }), [profile, loc.country, loc.city, serverQuery]);
  const debounced = useDebounced(query, 450);
  const runSearch = useCallback(async (p: Profile, where: UserLocation, boardQuery = "") => {
    const id = ++seq.current;
    setSearching(true);
    setSearchError("");
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
    } catch (e) {
      if (id === seq.current) setSearchError(e instanceof Error ? e.message : "Search failed");
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
  const retry = useCallback(() => {
    if (profile) runSearch(profile, { country: loc.country, city: loc.city }, serverQuery);
  }, [profile, loc.country, loc.city, serverQuery, runSearch]);

  // ---- CV upload + optional AI read
  const aiReadText = useCallback(
    async (text: string, base: Profile) => {
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
        setNotice(`${e instanceof Error ? e.message : "AI couldn't read the CV."} Using the standard CV read instead.`);
      } finally {
        setAiReading(false);
      }
    },
    [setProfile, setLoc],
  );
  const aiRead = useCallback(() => {
    if (profile && cvText) aiReadText(cvText, profile);
  }, [profile, cvText, aiReadText]);

  const parse = useCallback(
    async (body: BodyInit, headers?: HeadersInit) => {
      setParsing(true);
      setParseError("");
      try {
        const res = await fetch("/api/parse", { method: "POST", body, headers });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Couldn't read that CV");
        if (!json.profile.skills.length && !json.profile.titles.length && !ai.enabled) {
          throw new Error("We couldn't find any skills or roles in that CV. Try pasting the text instead.");
        }
        setQ("");
        setOnlyNew(false);
        setServerQuery("");
        setData(null);
        setCvText(json.text ?? "");
        setProfile(json.profile);
        if (ai.enabled) aiReadText(json.text ?? "", json.profile);
      } catch (e) {
        setParseError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setParsing(false);
      }
    },
    [ai.enabled, aiReadText, setCvText, setProfile],
  );
  const onFile = useCallback(
    (f: File) => {
      const fd = new FormData();
      fd.append("cv", f);
      parse(fd);
    },
    [parse],
  );
  const onText = useCallback((text: string) => parse(JSON.stringify({ text }), { "content-type": "application/json" }), [parse]);
  const loadSample = useCallback(() => onText(SAMPLE_CV), [onText]);

  const reset = useCallback(() => {
    seq.current++;
    setProfile(null);
    setCvText("");
    setData(null);
    setParseError("");
    setSearchError("");
    setNotice("");
    setSearching(false);
    setQ("");
    setOnlyNew(false);
    setServerQuery("");
    setNewIds(new Set());
    setSelectedId(null);
  }, [setProfile, setCvText]);

  // ---- tracker
  const trackedList = useMemo(() => Object.values(tracked), [tracked]);
  const slim = (job: ScoredJob) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { description, ...rest } = job;
    return rest;
  };
  const save = useCallback(
    (job: ScoredJob) => {
      const existing = tracked[job.id];
      if (existing) {
        setTracked((t) => {
          const n = { ...t };
          delete n[job.id];
          return n;
        });
        toast("Removed from your tracker", { action: { label: "Undo", run: () => setTracked((t) => ({ ...t, [job.id]: existing })) } });
      } else {
        const now = new Date().toISOString();
        setTracked((t) => ({ ...t, [job.id]: { job: slim(job), stage: "saved", note: "", savedAt: now, updatedAt: now, history: [{ stage: "saved", at: now }] } }));
        toast("Saved to your tracker", { tone: "success" });
      }
    },
    [tracked, setTracked, toast],
  );
  const addNote = useCallback(
    (job: ScoredJob, text: string) => {
      setTracked((t) => {
        const now = new Date().toISOString();
        const ex = t[job.id];
        if (ex) return { ...t, [job.id]: { ...ex, note: ex.note ? `${ex.note}\n\n${text}` : text, updatedAt: now } };
        return { ...t, [job.id]: { job: slim(job), stage: "saved", note: text, savedAt: now, updatedAt: now, history: [{ stage: "saved", at: now }] } };
      });
      toast("Saved to this job's notes in the Tracker", { tone: "success" });
    },
    [setTracked, toast],
  );
  const patch = useCallback(
    (id: string, p: Partial<Tracked>) => setTracked((t) => (t[id] ? { ...t, [id]: { ...t[id], ...p, updatedAt: new Date().toISOString() } } : t)),
    [setTracked],
  );
  const setStage = useCallback(
    (id: string, stage: Stage) => {
      if (stage === "offer" && tracked[id] && tracked[id].stage !== "offer") {
        confetti();
        toast("Congratulations on the offer! 🎉", { tone: "success" });
      }
      setTracked((t) => {
        const ex = t[id];
        if (!ex || ex.stage === stage) return t;
        const now = new Date().toISOString();
        return { ...t, [id]: { ...ex, stage, updatedAt: now, history: [...(ex.history ?? []), { stage, at: now }] } };
      });
    },
    [tracked, setTracked, toast],
  );
  const setNote = useCallback((id: string, note: string) => patch(id, { note }), [patch]);
  const setFollowUp = useCallback((id: string, followUp: string) => patch(id, { followUp: followUp || undefined }), [patch]);
  const removeTracked = useCallback(
    (id: string) => {
      const existing = tracked[id];
      setTracked((t) => {
        const n = { ...t };
        delete n[id];
        return n;
      });
      if (existing) toast("Removed from your tracker", { action: { label: "Undo", run: () => setTracked((t) => ({ ...t, [id]: existing })) } });
    },
    [tracked, setTracked, toast],
  );

  // ---- hidden jobs
  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const hide = useCallback(
    (id: string) => {
      setHiddenIds((h) => (h.includes(id) ? h : [...h, id]));
      toast("Job hidden", { action: { label: "Undo", run: () => setHiddenIds((h) => h.filter((x) => x !== id)) } });
    },
    [setHiddenIds, toast],
  );
  const restoreHidden = useCallback(() => setHiddenIds([]), [setHiddenIds]);

  // ---- derived results
  const hay = useMemo(() => new Map((data?.results ?? []).map((j) => [j.id, haystack(j)] as const)), [data]);
  const showAbroad = loc.abroad || !loc.country;
  const filtered = useMemo(
    () => (data ? applyFilters(data.results, { ...filters, q: dq }, hiddenSet, showAbroad, newIds, hay) : []),
    [data, filters, dq, hiddenSet, showAbroad, newIds, hay],
  );
  const counts = useMemo(() => {
    const c = { local: 0, remote: 0, abroad: 0 };
    for (const j of data?.results ?? []) c[j.loc]++;
    return c;
  }, [data]);
  const newCount = useMemo(() => (data?.results ?? []).filter((j) => newIds.has(j.id) && (showAbroad || j.loc !== "abroad")).length, [data, newIds, showAbroad]);
  const terms = useMemo(
    () => [...dq.matchAll(/"([^"]+)"|(\S+)/g)].map((m) => m[1] ?? (m[2].startsWith("-") ? "" : m[2])).filter((t) => t.length > 1),
    [dq],
  );

  // ---- saved searches
  const saveSearch = useCallback(
    (name: string) => {
      const { q: fq, onlyNew: fn, ...rest } = filters;
      const s: SavedSearch = { id: `s${Date.now().toString(36)}`, name: name.trim() || serverQuery || fq || "My search", query: serverQuery, q: fq, filters: rest, onlyNew: fn };
      setSearches((l) => [s, ...l].slice(0, 20));
      toast(`Saved search "${s.name}"`, { tone: "success" });
    },
    [filters, serverQuery, setSearches, toast],
  );
  const deleteSearch = useCallback((id: string) => setSearches((l) => l.filter((s) => s.id !== id)), [setSearches]);
  const applySearch = useCallback(
    (s: SavedSearch) => {
      setServerQuery(s.query);
      setFilters({ ...DEFAULT_FILTERS, ...s.filters, q: s.q, onlyNew: s.onlyNew });
    },
    [setFilters],
  );

  // ---- getting-started checklist
  const markVisited = useCallback((what: "insights" | "cv") => setOnboarding((o) => (o[what] ? o : { ...o, [what]: true })), [setOnboarding]);
  const dismissOnboarding = useCallback(() => setOnboarding((o) => ({ ...o, dismissed: true })), [setOnboarding]);

  // ---- job detail panel (works from any screen)
  const selected = useMemo<ScoredJob | null>(() => {
    if (!selectedId) return null;
    const fromResults = data?.results.find((j) => j.id === selectedId);
    if (fromResults) return fromResults;
    const t = tracked[selectedId];
    return t ? ({ ...t.job, description: "" } as ScoredJob) : null;
  }, [selectedId, data, tracked]);
  const openJob = useCallback((id: string) => setSelectedId(id), []);
  const closeJob = useCallback(() => setSelectedId(null), []);

  const value: Ctx = {
    ready, settings, setSettings, dark,
    profile, setProfile, cvText, parsing, parseError, notice, dismissNotice: () => setNotice(""),
    onFile, onText, loadSample, reset, aiReading, aiRead, ai,
    loc, setLoc,
    data, searching, searchError, retry, serverQuery, setServerQuery,
    filters, setFilters, filterCount: activeFilterCount(filters), filtered, counts, newIds, newCount, terms, showAbroad,
    hiddenIds, hiddenSet, hide, restoreHidden,
    tracked, trackedList, save, addNote, setStage, setNote, setFollowUp, removeTracked,
    searches, saveSearch, deleteSearch, applySearch,
    onboarding, markVisited, dismissOnboarding,
    selected, openJob, closeJob, paletteOpen, setPaletteOpen, helpOpen, setHelpOpen,
    toasts, toast, dismissToast,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
