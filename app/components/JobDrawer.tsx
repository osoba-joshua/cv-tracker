"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Bookmark, BookmarkCheck, Briefcase, Clock, EyeOff, ExternalLink, Gauge, Globe, GraduationCap, MapPin, Share2, X } from "lucide-react";
import { STAGES, timeAgo, type Stage } from "@/lib/client";
import { countryName } from "@/lib/geo";
import { useApp } from "@/lib/store";
import { LEVEL_NAMES, type ScoredJob } from "@/lib/types";
import AiAssistant from "./AiAssistant";
import { Logo } from "./JobCard";
import ScoreRing, { scoreLabel, scoreTone } from "./ScoreRing";

// Full descriptions are fetched when a job is opened (the list only carries a short excerpt).
const descMemo = new Map<string, string>();

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

function Highlighted({ text, matched, missing }: { text: string; matched: string[]; missing: string[] }) {
  const parts = useMemo(() => {
    const all = [...matched, ...missing];
    if (!all.length) return [text];
    const re = new RegExp(`(?<![a-z0-9+#.])(${all.map(esc).join("|")})(?![a-z0-9+#])`, "gi");
    return text.split(re);
  }, [text, matched, missing]);
  const good = new Set(matched.map((s) => s.toLowerCase()));
  const gap = new Set(missing.map((s) => s.toLowerCase()));
  return (
    <>
      {parts.map((p, i) => {
        const k = p.toLowerCase();
        if (i % 2 === 1 && good.has(k)) return <mark key={i} className="rounded bg-good-soft px-0.5 font-medium text-good">{p}</mark>;
        if (i % 2 === 1 && gap.has(k)) return <mark key={i} className="rounded bg-warn-soft px-0.5 font-medium text-warn">{p}</mark>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function Bar({ label, value, note }: { label: string; value: number | null; note?: string }) {
  const v = value ?? 0;
  const tone = v >= 70 ? "var(--good)" : v >= 40 ? "var(--warn)" : "var(--muted)";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted">{value === null ? "Not specified" : note ?? `${v}%`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value === null ? 0 : Math.max(v, 3)}%`, background: tone }} />
      </div>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface-2/60 px-3 py-2.5">
      <Icon size={16} className="mt-0.5 shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
        <p className="truncate text-sm font-medium first-letter:uppercase">{value}</p>
      </div>
    </div>
  );
}

type TabId = "overview" | "description" | "ai";

export default function JobDrawer() {
  const { selected } = useApp();
  if (!selected) return null;
  return <DrawerBody key={selected.id} job={selected} />;
}

function DrawerBody({ job }: { job: ScoredJob }) {
  const { closeJob, save, setStage, hide, ai, cvText, loc, tracked, addNote, toast } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [full, setFull] = useState<string | null>(descMemo.get(job.id) ?? null);
  const stage = tracked[job.id]?.stage;
  const home = countryName(loc.country);

  useEffect(() => {
    let live = true;
    if (!descMemo.has(job.id)) {
      fetch(`/api/job?id=${encodeURIComponent(job.id)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          const text = j?.description ?? job.description;
          if (j?.description) descMemo.set(job.id, j.description);
          if (live) setFull(text);
        })
        .catch(() => live && setFull(job.description));
    }
    return () => {
      live = false;
    };
  }, [job.id, job.description]);

  const loadingFull = full === null;
  const description = full ?? job.description;
  const fullJob = useMemo(() => ({ ...job, description }), [job, description]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeJob();
      if (e.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),select,textarea,input,[tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [closeJob]);

  async function share() {
    const data = { title: `${job.title} at ${job.company}`, url: job.url };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(job.url);
        toast("Link copied to clipboard", { tone: "success" });
      }
    } catch {}
  }

  const locFit = job.loc === "local" ? 100 : job.loc === "remote" ? 80 : 25;
  const locNote = job.loc === "local" ? `In ${home || "your country"}` : job.loc === "remote" ? "Remote, open to you" : `Outside ${home || "your country"}`;
  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "description", label: "Description" },
    { id: "ai", label: "AI copilot" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="backdrop absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={closeJob} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${job.title} at ${job.company}`}
        className="drawer relative flex h-full w-full max-w-2xl flex-col bg-bg outline-none"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <div className="border-b border-line bg-card px-5 pt-5">
          <div className="flex items-start gap-3.5">
            <Logo job={job} size={56} />
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold leading-snug tracking-tight">{job.title}</h2>
              <p className="mt-0.5 text-sm text-muted">
                <span className="font-medium text-fg-2">{job.company}</span> · {job.location}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {job.remote && <span className="chip chip-accent">Remote</span>}
                {job.salary && <span className="chip chip-good">{job.salary}</span>}
                {job.level !== undefined && <span className="chip">{LEVEL_NAMES[job.level]}</span>}
                <span className="chip">{job.source}</span>
              </div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={closeJob} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          <div role="tablist" className="-mb-px mt-4 flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`cursor-pointer border-b-2 px-3 pb-2.5 pt-1 text-sm font-medium transition-colors ${tab === t.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "overview" && (
            <div className="space-y-6">
              <section className="card flex items-center gap-4 p-4">
                <ScoreRing score={job.score} size={84} none={job.matched.length === 0} />
                <div>
                  <p className="text-lg font-semibold" style={{ color: job.matched.length ? scoreTone(job.score) : undefined }}>
                    {job.matched.length === 0 ? "Outside your CV" : scoreLabel(job.score)}
                  </p>
                  <p className="text-sm text-muted">
                    You have {job.matched.length} of the {job.skills.length || job.matched.length} skills this posting mentions.
                  </p>
                </div>
              </section>

              <section aria-label="Why this score">
                <h3 className="label flex items-center gap-1.5"><Gauge size={13} /> Why this score</h3>
                <div className="card space-y-3.5 p-4">
                  <Bar label="Skill coverage" value={job.parts.skills} />
                  <Bar label="Core skills you have" value={job.parts.breadth} />
                  <Bar label="Role fit" value={job.parts.title} />
                  <Bar label="Seniority fit" value={job.parts.level} />
                  <Bar label="Location" value={locFit} note={locNote} />
                </div>
              </section>

              {job.loc === "abroad" && (
                <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
                  This job is based outside {home || "your country"} ({job.location}). Check visa, relocation or remote eligibility before you apply.
                </p>
              )}

              <section className="grid gap-2 sm:grid-cols-2" aria-label="Job details">
                <Fact icon={MapPin} label="Location" value={job.location} />
                <Fact icon={Briefcase} label="Type" value={job.jobType?.replace(/_/g, " ")} />
                <Fact icon={GraduationCap} label="Level" value={job.level !== undefined ? LEVEL_NAMES[job.level] : undefined} />
                <Fact icon={Banknote} label="Salary" value={job.salary} />
                <Fact icon={Clock} label="Posted" value={job.postedAt ? timeAgo(job.postedAt) : undefined} />
                <Fact icon={Globe} label="Source" value={job.source} />
              </section>

              {job.matched.length > 0 && (
                <section>
                  <h3 className="label">Skills you have</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {job.matched.map((s) => (
                      <span key={s} className="chip chip-good">✓ {s}</span>
                    ))}
                  </div>
                </section>
              )}
              {job.missing.length > 0 && (
                <section>
                  <h3 className="label">Gaps to close</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {job.missing.map((s) => (
                      <span key={s} className="chip chip-warn">{s}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">Mentioned in the posting but not on your profile. If you have them, add them under Your profile.</p>
                </section>
              )}
            </div>
          )}

          {tab === "description" && (
            <section>
              {loadingFull && description.length >= 290 && <p className="mb-3 text-xs text-muted">Loading the full description…</p>}
              <div className="whitespace-pre-line text-[15px] leading-relaxed text-fg-2">
                {description ? <Highlighted text={description} matched={job.matched} missing={job.missing} /> : <span className="text-muted">No description provided. Open the original posting for details.</span>}
              </div>
              {description.length >= 3900 && <p className="mt-3 text-xs text-muted">Description shortened. See the full posting on {job.source}.</p>}
            </section>
          )}

          {tab === "ai" && <AiAssistant job={fullJob} cv={cvText} enabled={ai.enabled} providers={ai.providers} onSaveNote={(text) => addNote(job, text)} />}
        </div>

        <div className="space-y-3 border-t border-line bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-wrap items-center gap-2">
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg flex-1 sm:flex-none">
              Apply on {job.source} <ExternalLink size={16} />
            </a>
            <button className={`btn btn-lg ${stage ? "!bg-accent-soft !text-accent" : ""}`} onClick={() => save(job)} aria-pressed={!!stage}>
              {stage ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
              <span className="hidden sm:inline">{stage ? "Saved" : "Save"}</span>
            </button>
            {stage && (
              <select className="input !h-11 !w-auto" value={stage} onChange={(e) => setStage(job.id, e.target.value as Stage)} aria-label="Application stage">
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
            <button className="btn btn-ghost btn-lg !px-3" onClick={share} aria-label="Share this job">
              <Share2 size={17} />
            </button>
            <button
              className="btn btn-ghost btn-lg !px-3 text-muted"
              onClick={() => {
                hide(job.id);
                closeJob();
              }}
              aria-label="Hide this job"
            >
              <EyeOff size={17} />
            </button>
          </div>
          <p className="text-xs text-muted">
            Listing from{" "}
            <a href={job.sourceUrl} target="_blank" rel="noopener" className="font-medium text-accent hover:underline">
              {job.source}
            </a>
            . Applications go through the original posting.
          </p>
        </div>
      </div>
    </div>
  );
}
