"use client";
import { useState } from "react";
import { STAGES, isDue, timeAgo, toCsv, type Stage, type Tracked } from "@/lib/client";
import { Logo } from "./JobCard";
import ScoreRing from "./ScoreRing";

export default function Tracker({
  items,
  setStage,
  setNote,
  setFollowUp,
  remove,
  goDiscover,
}: {
  items: Tracked[];
  setStage: (id: string, s: Stage) => void;
  setNote: (id: string, n: string) => void;
  setFollowUp: (id: string, date: string) => void;
  remove: (id: string) => void;
  goDiscover: () => void;
}) {
  const [over, setOver] = useState<Stage | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([toCsv(items)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "cv-tracker-applications.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
            <path d="M6 3h12v18l-6-4-6 4z" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold">Nothing tracked yet</h2>
        <p className="mt-2 text-muted">Save jobs from Discover to follow them from Saved all the way to Offer.</p>
        <button className="btn btn-primary mt-5" onClick={goDiscover}>
          Browse jobs
        </button>
      </div>
    );
  }

  const count = (s: Stage) => items.filter((i) => i.stage === s).length;
  const applied = items.filter((i) => i.stage !== "saved").length;
  const due = items.filter(isDue).length;
  const progressed = items.filter((i) => i.stage === "interview" || i.stage === "offer").length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Application tracker</h1>
          <p className="text-sm text-muted">
            {items.length} tracked · {applied} applied · {applied ? Math.round((progressed / applied) * 100) : 0}% reached interview or offer
            {due > 0 && <span className="ml-2 font-medium text-bad">· {due} follow-up{due > 1 ? "s" : ""} due</span>}
          </p>
        </div>
        <button className="btn" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div className="flex snap-x gap-3 overflow-x-auto pb-4">
        {STAGES.map((st) => (
          <section
            key={st.id}
            aria-label={st.label}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(st.id);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) setStage(id, st.id);
            }}
            className={`w-[85%] shrink-0 snap-start sm:w-72 rounded-xl border p-2 transition-colors ${over === st.id ? "border-accent bg-accent-soft" : "border-line bg-card/50"}`}
          >
            <h2 className="flex items-center justify-between px-2 py-1.5 text-sm font-semibold">
              {st.label}
              <span className="chip">{count(st.id)}</span>
            </h2>
            <div className="min-h-24 space-y-2">
              {items
                .filter((i) => i.stage === st.id)
                .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
                .map((t) => (
                  <article
                    key={t.job.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", t.job.id)}
                    className="card cursor-grab p-3 active:cursor-grabbing"
                  >
                    <div className="flex gap-2.5">
                      <Logo job={t.job} size={36} />
                      <div className="min-w-0 flex-1">
                        <a href={t.job.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-semibold leading-snug hover:text-accent">
                          {t.job.title}
                        </a>
                        <p className="truncate text-xs text-muted">{t.job.company}</p>
                      </div>
                      <ScoreRing score={t.job.score} size={34} />
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {t.job.salary ? `${t.job.salary} · ` : ""}updated {timeAgo(t.updatedAt) || "now"}
                    </p>
                    {open === t.job.id ? (
                      <textarea
                        autoFocus
                        className="input mt-2 text-xs"
                        rows={3}
                        placeholder="Notes: contact, deadline, next step…"
                        defaultValue={t.note}
                        onBlur={(e) => {
                          setNote(t.job.id, e.target.value);
                          setOpen(null);
                        }}
                      />
                    ) : (
                      t.note && <p className="mt-2 line-clamp-2 rounded bg-bg px-2 py-1 text-xs">{t.note}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-muted">
                        Follow up
                        <input
                          type="date"
                          className="input !w-auto !px-1.5 !py-0.5 text-xs"
                          value={t.followUp ?? ""}
                          onChange={(e) => setFollowUp(t.job.id, e.target.value)}
                        />
                      </label>
                      {isDue(t) && <span className="chip !border-transparent !bg-bad-soft !text-bad">Due</span>}
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <select
                        className="input !w-auto !py-1 text-xs"
                        value={t.stage}
                        aria-label={`Move ${t.job.title}`}
                        onChange={(e) => setStage(t.job.id, e.target.value as Stage)}
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-ghost !px-2 !py-1 text-xs" onClick={() => setOpen(t.job.id)}>
                        Note
                      </button>
                      <button className="btn btn-ghost ml-auto !px-2 !py-1 text-xs text-bad" onClick={() => remove(t.job.id)} aria-label={`Remove ${t.job.title}`}>
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
      <p className="text-xs text-muted">Tip: drag cards between columns. Your tracker is stored only in this browser.</p>
    </div>
  );
}
