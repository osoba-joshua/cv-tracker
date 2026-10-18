"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bookmark, CalendarClock, Columns3, Download, ExternalLink, History, LayoutGrid, List, MessageSquare, Search, Trash2, X } from "lucide-react";
import { STAGES, isDue, timeAgo, toCsv, useLocalStorage, type Stage, type Tracked } from "@/lib/client";
import { downloadFile } from "@/lib/backup";
import { AppLink } from "@/lib/nav";
import { useApp } from "@/lib/store";
import { Logo } from "./JobCard";
import ScoreRing from "./ScoreRing";

const TONE: Record<Stage, string> = {
  saved: "var(--muted)",
  applied: "var(--accent)",
  interview: "var(--warn)",
  offer: "var(--good)",
  rejected: "var(--bad)",
};
const label = (s: Stage) => STAGES.find((x) => x.id === s)?.label ?? s;
const today = () => new Date().toISOString().slice(0, 10);

function StageSelect({ value, onChange, id }: { value: Stage; onChange: (s: Stage) => void; id: string }) {
  return (
    <select
      className="input !h-8 !w-auto !rounded-lg !py-0 !pl-2.5 !pr-7 text-xs font-medium"
      value={value}
      aria-label={`Stage for ${id}`}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as Stage)}
      style={{ color: TONE[value] }}
    >
      {STAGES.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

function Detail({ item, onClose }: { item: Tracked; onClose: () => void }) {
  const { setStage, setNote, setFollowUp, removeTracked, openJob } = useApp();
  const j = item.job;
  const [note, setNoteText] = useState(item.note);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const history = [...(item.history ?? [{ stage: item.stage, at: item.savedAt }])].reverse();

  return (
    <div className="fixed inset-0 z-[55] grid place-items-center p-4">
      <div className="backdrop absolute inset-0 bg-black/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={j.title} className="pop card relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden !rounded-3xl" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="flex items-start gap-3 border-b border-line p-5">
          <Logo job={j} size={44} />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold leading-snug">{j.title}</h2>
            <p className="text-sm text-muted">{j.company} · {j.location}</p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="d-stage">Stage</label>
              <select id="d-stage" className="input" value={item.stage} onChange={(e) => setStage(j.id, e.target.value as Stage)}>
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="d-follow">Follow up on</label>
              <input id="d-follow" type="date" className="input" value={item.followUp ?? ""} onChange={(e) => setFollowUp(j.id, e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="d-note">Notes</label>
            <textarea id="d-note" className="input min-h-32 leading-relaxed" placeholder="Contact name, salary talk, questions to ask, next step…" value={note} onChange={(e) => setNoteText(e.target.value)} onBlur={() => setNote(j.id, note)} />
          </div>
          <div>
            <h3 className="label flex items-center gap-1.5"><History size={12} /> History</h3>
            <ol className="relative space-y-3 border-l border-line pl-5">
              {history.map((h, i) => (
                <li key={`${h.stage}-${h.at}-${i}`} className="relative">
                  <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-card" style={{ background: TONE[h.stage] }} />
                  <p className="text-sm font-medium">{label(h.stage)}</p>
                  <p className="text-xs text-muted">{new Date(h.at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} · {timeAgo(h.at)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line bg-surface-2/50 p-4">
          <button className="btn btn-primary" onClick={() => { onClose(); openJob(j.id); }}>View job details</button>
          <a className="btn" href={j.url} target="_blank" rel="noopener noreferrer">Apply link <ExternalLink size={14} /></a>
          <button className="btn btn-ghost ml-auto text-bad" onClick={() => { removeTracked(j.id); onClose(); }}><Trash2 size={14} /> Remove</button>
        </div>
      </div>
    </div>
  );
}

export default function TrackerView() {
  const { ready, trackedList, setStage, setFollowUp, openJob } = useApp();
  const [view, setView] = useLocalStorage<"board" | "list">("cvt:trackerView", "board");
  const [q, setQ] = useState("");
  const [over, setOver] = useState<Stage | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: "updated" | "match" | "stage" | "follow"; dir: 1 | -1 }>({ key: "updated", dir: -1 });

  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? trackedList.filter((x) => `${x.job.title} ${x.job.company} ${x.note}`.toLowerCase().includes(t)) : trackedList;
  }, [trackedList, q]);
  const detail = trackedList.find((x) => x.job.id === detailId) ?? null;

  if (!ready) return <div className="mx-auto max-w-7xl px-4 py-8"><div className="skeleton h-40 rounded-2xl" /></div>;

  if (!trackedList.length) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-accent-soft text-accent"><Bookmark size={28} /></span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Nothing tracked yet</h1>
        <p className="mt-2 text-muted">Save jobs from Discover and follow them from Saved all the way to Offer, with notes and follow-up reminders.</p>
        <AppLink href="/" className="btn btn-primary btn-lg mt-6">Browse jobs</AppLink>
      </main>
    );
  }

  const count = (s: Stage) => trackedList.filter((i) => i.stage === s).length;
  const applied = trackedList.filter((i) => i.stage !== "saved").length;
  const interviews = count("interview") + count("offer");
  const offers = count("offer");
  const due = trackedList.filter(isDue);
  const rate = applied ? Math.round((interviews / applied) * 100) : 0;

  const sorted = [...items].sort((a, b) => {
    const d = sort.dir;
    if (sort.key === "match") return (a.job.score - b.job.score) * d;
    if (sort.key === "stage") return (STAGES.findIndex((s) => s.id === a.stage) - STAGES.findIndex((s) => s.id === b.stage)) * d;
    if (sort.key === "follow") return ((a.followUp ?? "9999") < (b.followUp ?? "9999") ? -1 : 1) * d;
    return (+new Date(a.updatedAt) - +new Date(b.updatedAt)) * d;
  });
  const th = (key: typeof sort.key, text: string) => (
    <button className="inline-flex cursor-pointer items-center gap-1 font-semibold uppercase tracking-wider hover:text-fg" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))}>
      {text} {sort.key === key ? (sort.dir === 1 ? "↑" : "↓") : ""}
    </button>
  );

  const card = (t: Tracked) => (
    <article
      key={t.job.id}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", t.job.id)}
      onClick={() => setDetailId(t.job.id)}
      className="card card-hover cursor-pointer p-3 active:cursor-grabbing"
    >
      <div className="flex gap-2.5">
        <Logo job={t.job} size={36} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{t.job.title}</p>
          <p className="truncate text-xs text-muted">{t.job.company}</p>
        </div>
        <ScoreRing score={t.job.score} size={34} none={t.job.matched.length === 0} />
      </div>
      {(t.followUp || t.note) && (
        <div className="mt-2.5 space-y-1.5">
          {t.followUp && (
            <span className={`chip ${isDue(t) ? "!border-transparent !bg-bad-soft !text-bad" : ""}`}><CalendarClock size={11} /> {isDue(t) ? "Due " : ""}{new Date(t.followUp + "T00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
          )}
          {t.note && <p className="line-clamp-2 flex gap-1.5 rounded-lg bg-surface-2 px-2 py-1.5 text-xs text-muted"><MessageSquare size={12} className="mt-0.5 shrink-0" />{t.note}</p>}
        </div>
      )}
      <div className="mt-2.5 flex items-center justify-between">
        <StageSelect value={t.stage} onChange={(s) => setStage(t.job.id, s)} id={t.job.title} />
        <span className="text-[11px] text-muted">{timeAgo(t.updatedAt) || "now"}</span>
      </div>
    </article>

  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-3xl"><Columns3 className="text-accent" size={26} /> Application tracker</h1>
          <p className="mt-1 text-sm text-muted">Your whole pipeline in one place. Stored only in this browser. Back it up in Settings.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input !h-9 !w-44 !pl-9 sm:!w-56" placeholder="Search tracker…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tracker" />
          </div>
          <div className="flex rounded-xl bg-surface-2 p-1" role="group" aria-label="View">
            <button className={`grid h-7 w-8 cursor-pointer place-items-center rounded-lg ${view === "board" ? "bg-card shadow-sm" : "text-muted"}`} onClick={() => setView("board")} aria-pressed={view === "board"} aria-label="Board view"><LayoutGrid size={15} /></button>
            <button className={`grid h-7 w-8 cursor-pointer place-items-center rounded-lg ${view === "list" ? "bg-card shadow-sm" : "text-muted"}`} onClick={() => setView("list")} aria-pressed={view === "list"} aria-label="List view"><List size={15} /></button>
          </div>
          <button className="btn" onClick={() => downloadFile("cv-tracker-applications.csv", toCsv(trackedList), "text/csv")}><Download size={15} /> <span className="hidden sm:inline">Export</span></button>
        </div>
      </div>

      {/* KPIs + funnel */}
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_1.1fr]">
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Tracked", trackedList.length, "var(--fg)"],
            ["Applied", applied, "var(--accent)"],
            ["Response rate", `${rate}%`, rate ? "var(--good)" : "var(--muted)"],
          ].map(([l, v, c]) => (
            <div key={l as string} className="card px-4 py-3">
              <p className="text-xs font-medium text-muted">{l}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: c as string }}>{v}</p>
            </div>
          ))}
        </div>
        <div className="card px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
            <span>Pipeline</span>
            <span>{offers} offer{offers === 1 ? "" : "s"} · {interviews} interview{interviews === 1 ? "" : "s"}</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label="Pipeline by stage">
            {STAGES.map((s) => (count(s.id) ? <div key={s.id} style={{ width: `${(count(s.id) / trackedList.length) * 100}%`, background: TONE[s.id] }} title={`${s.label}: ${count(s.id)}`} /> : null))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {STAGES.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 text-muted"><span className="h-2 w-2 rounded-full" style={{ background: TONE[s.id] }} />{s.label} <strong className="text-fg">{count(s.id)}</strong></span>
            ))}
          </div>
        </div>
      </div>

      {due.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm">
          <AlertCircle size={18} className="shrink-0 text-bad" />
          <span className="font-medium text-bad">{due.length} follow-up{due.length > 1 ? "s" : ""} due:</span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {due.slice(0, 4).map((d) => (
              <button key={d.job.id} className="btn btn-sm" onClick={() => setDetailId(d.job.id)}>{d.job.company} · {d.job.title.slice(0, 28)}{d.job.title.length > 28 ? "…" : ""}</button>
            ))}
          </div>
        </div>
      )}

      {view === "board" ? (
        <div className="flex snap-x gap-3 overflow-x-auto pb-4">
          {STAGES.map((st) => {
            const col = items.filter((i) => i.stage === st.id).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
            return (
              <section
                key={st.id}
                aria-label={st.label}
                onDragOver={(e) => { e.preventDefault(); setOver(st.id); }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) setStage(id, st.id);
                }}
                className={`w-[86%] shrink-0 snap-start rounded-2xl border p-2 transition-colors sm:w-72 ${over === st.id ? "border-accent bg-accent-soft" : "border-line bg-surface-2/50"}`}
              >
                <h2 className="flex items-center justify-between px-2 py-2 text-sm font-semibold">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TONE[st.id] }} />{st.label}</span>
                  <span className="chip tabular-nums">{col.length}</span>
                </h2>
                <div className="min-h-24 space-y-2">
                  {col.length === 0 && <p className="rounded-xl border border-dashed border-line-strong px-3 py-6 text-center text-xs text-muted">Drop a card here</p>}
                  {col.map((t) => card(t))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <>
        <div className="grid gap-2.5 md:hidden">
          {sorted.length === 0 && <p className="card px-4 py-10 text-center text-muted">No tracked jobs match &quot;{q}&quot;.</p>}
          {sorted.map((t) => (
            <div key={t.job.id}>{card(t)}</div>
          ))}
        </div>
        <div className="card hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] text-muted">
                <th className="px-4 py-3 font-semibold uppercase tracking-wider">Job</th>
                <th className="px-3 py-3">{th("stage", "Stage")}</th>
                <th className="px-3 py-3">{th("match", "Match")}</th>
                <th className="px-3 py-3">{th("follow", "Follow up")}</th>
                <th className="px-3 py-3">{th("updated", "Updated")}</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.job.id} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2/60" onClick={() => setDetailId(t.job.id)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Logo job={t.job} size={34} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{t.job.title}</p>
                        <p className="truncate text-xs text-muted">{t.job.company} · {t.job.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><StageSelect value={t.stage} onChange={(s) => setStage(t.job.id, s)} id={t.job.title} /></td>
                  <td className="px-3 py-3"><ScoreRing score={t.job.score} size={34} none={t.job.matched.length === 0} /></td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="date" className={`input !h-8 !w-36 !px-2 text-xs ${isDue(t) ? "!border-bad !text-bad" : ""}`} min={today()} value={t.followUp ?? ""} onChange={(e) => setFollowUp(t.job.id, e.target.value)} aria-label={`Follow up date for ${t.job.title}`} />
                  </td>
                  <td className="px-3 py-3 text-xs text-muted">{timeAgo(t.updatedAt) || "now"}</td>
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openJob(t.job.id)}>Open</button>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No tracked jobs match &quot;{q}&quot;.</td></tr>}
            </tbody>
          </table>
        </div>
        </>
      )}
      <p className="mt-3 text-xs text-muted">Tip: drag cards between columns, click one for notes, reminders and history.</p>

      {detail && <Detail key={detail.job.id} item={detail} onClose={() => setDetailId(null)} />}
    </main>
  );
}
