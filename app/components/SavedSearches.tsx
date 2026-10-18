"use client";
import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkPlus, Trash2 } from "lucide-react";
import { useApp } from "@/lib/store";

/** Saved searches: store the current query + filters under a name and bring them back with one click. */
export default function SavedSearches() {
  const { searches, saveSearch, deleteSearch, applySearch, serverQuery, filterCount } = useApp();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const canSave = !!serverQuery || filterCount > 0;

  return (
    <div ref={box} className="relative">
      <button className="btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog">
        <Bookmark size={15} />
        <span className="hidden sm:inline">Saved searches</span>
        {searches.length > 0 && <span className="rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold text-accent">{searches.length}</span>}
      </button>
      {open && (
        <div className="pop card absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] p-3" style={{ boxShadow: "var(--shadow-lg)" }}>
          <p className="label">Save the current search</p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveSearch(name);
              setName("");
              setOpen(false);
            }}
          >
            <input className="input" placeholder={canSave ? "Name it (optional)" : "Set a filter or search first"} value={name} onChange={(e) => setName(e.target.value)} disabled={!canSave} />
            <button className="btn btn-primary btn-icon shrink-0" disabled={!canSave} aria-label="Save search">
              <BookmarkPlus size={16} />
            </button>
          </form>
          <p className="label mt-4">Your searches</p>
          {searches.length === 0 ? (
            <p className="rounded-xl bg-surface-2 px-3 py-4 text-center text-sm text-muted">Nothing saved yet. Try filtering to remote-only strong matches, then save it.</p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {searches.map((s) => (
                <li key={s.id} className="group flex items-center gap-1 rounded-xl hover:bg-surface-2">
                  <button
                    className="min-w-0 flex-1 cursor-pointer px-3 py-2 text-left"
                    onClick={() => {
                      applySearch(s);
                      setOpen(false);
                    }}
                  >
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted">{[s.query && `“${s.query}”`, s.filters.remote && "Remote", s.filters.minScore && `${s.filters.minScore}%+`, s.q].filter(Boolean).join(" · ") || "Custom filters"}</p>
                  </button>
                  <button className="btn btn-ghost btn-icon !h-8 !w-8 text-muted opacity-60 hover:opacity-100" onClick={() => deleteSearch(s.id)} aria-label={`Delete ${s.name}`}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
