"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, Bookmark, Columns3, Compass, CornerDownLeft, Download, EyeOff, FileText, Filter, Flame, Globe, Keyboard, Moon,
  Search, Settings as Cog, Sparkles, Sun, Upload, Zap, type LucideIcon,
} from "lucide-react";
import { toCsv } from "@/lib/client";
import { useNavigate } from "@/lib/nav";
import { downloadFile } from "@/lib/backup";
import { useApp } from "@/lib/store";
import { DEFAULT_FILTERS } from "./Filters";

type Item = { id: string; group: string; label: string; hint?: string; icon: LucideIcon; keywords?: string; run: () => void };

export default function CommandPalette() {
  const navigate = useNavigate();
  const app = useApp();
  const { setPaletteOpen, filters, setFilters, dark, setSettings, trackedList, searches, hiddenIds } = app;
  const [query, setQuery] = useState("");
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const close = () => setPaletteOpen(false);

  useEffect(() => {
    input.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => navigate(href);
    const out: Item[] = [
      { id: "n-discover", group: "Go to", label: "Discover jobs", icon: Compass, run: go("/") },
      { id: "n-insights", group: "Go to", label: "Insights", hint: "Skill gaps, salaries, market", icon: BarChart3, run: go("/insights") },
      { id: "n-tracker", group: "Go to", label: "Application tracker", icon: Columns3, run: go("/tracker") },
      { id: "n-cv", group: "Go to", label: "My CV", hint: "Review and improve", icon: FileText, run: go("/cv") },
      { id: "n-settings", group: "Go to", label: "Settings", icon: Cog, run: go("/settings") },

      { id: "f-remote", group: "Filters", label: "Remote jobs only", icon: Globe, keywords: "filter", run: () => { setFilters({ ...filters, remote: true }); navigate("/"); } },
      { id: "f-strong", group: "Filters", label: "Strong matches only (65%+)", icon: Zap, keywords: "filter best", run: () => { setFilters({ ...filters, minScore: 65 }); navigate("/"); } },
      { id: "f-24h", group: "Filters", label: "Posted in the last 24 hours", icon: Flame, keywords: "filter new recent", run: () => { setFilters({ ...filters, posted: 1 }); navigate("/"); } },
      { id: "f-new", group: "Filters", label: "New since my last visit", icon: Sparkles, keywords: "filter", run: () => { setFilters({ ...filters, onlyNew: true }); navigate("/"); } },
      { id: "f-clear", group: "Filters", label: "Clear all filters", icon: Filter, keywords: "reset", run: () => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort }) },

      { id: "a-theme", group: "Actions", label: dark ? "Switch to light theme" : "Switch to dark theme", icon: dark ? Sun : Moon, keywords: "appearance dark light", run: () => setSettings((s) => ({ ...s, theme: dark ? "light" : "dark" })) },
      { id: "a-cv", group: "Actions", label: "Upload a new CV", icon: Upload, keywords: "replace reset", run: () => { app.reset(); navigate("/"); } },
      { id: "a-keys", group: "Actions", label: "Keyboard shortcuts", icon: Keyboard, keywords: "help", run: () => app.setHelpOpen(true) },
    ];
    if (trackedList.length) {
      out.push({ id: "a-csv", group: "Actions", label: "Export tracker to CSV", icon: Download, keywords: "download", run: () => downloadFile("cv-tracker-applications.csv", toCsv(trackedList), "text/csv") });
    }
    if (hiddenIds.length) {
      out.push({ id: "a-restore", group: "Actions", label: `Restore ${hiddenIds.length} hidden jobs`, icon: EyeOff, run: () => app.restoreHidden() });
    }
    for (const s of searches) {
      out.push({ id: `s-${s.id}`, group: "Saved searches", label: s.name, hint: s.query || s.q || "filters", icon: Bookmark, run: () => { app.applySearch(s); navigate("/"); } });
    }
    for (const t of trackedList.slice(0, 40)) {
      out.push({ id: `t-${t.job.id}`, group: "Tracked jobs", label: t.job.title, hint: `${t.job.company} · ${t.stage}`, icon: Columns3, keywords: t.job.company, run: () => app.openJob(t.job.id) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, dark, trackedList, searches, hiddenIds.length, navigate]);

  const results = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const base = words.length ? items.filter((it) => words.every((w) => `${it.label} ${it.hint ?? ""} ${it.keywords ?? ""} ${it.group}`.toLowerCase().includes(w))) : items.filter((it) => it.group !== "Tracked jobs");
    const out = base.slice(0, 40);
    if (query.trim().length > 1) {
      out.unshift({
        id: "board",
        group: "Search",
        label: `Search job boards for "${query.trim()}"`,
        hint: "Finds jobs even outside your CV",
        icon: Search,
        run: () => { app.setServerQuery(query.trim()); navigate("/"); },
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, navigate]);

  const active = Math.min(idx, Math.max(results.length - 1, 0));
  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = results[active];
      if (it) {
        close();
        it.run();
      }
    } else if (e.key === "Escape") {
      close();
    }
  }

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]" onKeyDown={onKey}>
      <div className="backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="pop card relative w-full max-w-xl overflow-hidden !rounded-2xl" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={18} className="text-muted" />
          <input
            ref={input}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={`palette-${active}`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIdx(0);
            }}
            placeholder="Type a command, a page, or search for any job…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          <span className="kbd">esc</span>
        </div>
        <div ref={list} id="palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-10 text-center text-sm text-muted">Nothing matches &quot;{query}&quot;</p>}
          {results.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            const Icon = it.icon;
            return (
              <div key={it.id}>
                {header && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{header}</p>}
                <button
                  id={`palette-${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setIdx(i)}
                  onClick={() => {
                    close();
                    it.run();
                  }}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${i === active ? "bg-accent-soft text-accent" : ""}`}
                >
                  <Icon size={17} className="shrink-0 opacity-80" />
                  <span className="min-w-0 flex-1 truncate font-medium">{it.label}</span>
                  {it.hint && <span className="hidden truncate text-xs text-muted sm:block">{it.hint}</span>}
                  {i === active && <CornerDownLeft size={14} className="shrink-0 opacity-60" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 border-t border-line bg-surface-2 px-4 py-2 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
          <span className="flex items-center gap-1.5"><span className="kbd">↵</span> select</span>
        </div>
      </div>
    </div>
  );
}
