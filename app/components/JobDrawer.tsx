"use client";
import { useEffect, useMemo, useRef } from "react";
import { STAGES, type Stage } from "@/lib/client";
import type { ScoredJob } from "@/lib/types";
import { LEVEL_NAMES } from "@/lib/types";
import { countryName } from "@/lib/geo";
import AiAssistant from "./AiAssistant";
import { Logo, Meta } from "./JobCard";
import ScoreRing, { scoreLabel } from "./ScoreRing";

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

export default function JobDrawer({
  job,
  home,
  cv,
  ai,
  stage,
  onClose,
  onSave,
  onStage,
  onHide,
  onSaveNote,
}: {
  job: ScoredJob;
  home: string;
  cv: string;
  ai: { enabled: boolean | null; providers: string[] };
  stage?: Stage;
  onClose: () => void;
  onSave: () => void;
  onStage: (s: Stage) => void;
  onHide: () => void;
  onSaveNote: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);

  const pct = Math.round((job.matched.length / Math.max(job.skills.length || 1, 1)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="backdrop absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${job.title} at ${job.company}`}
        className="drawer relative flex h-full w-full max-w-2xl flex-col bg-bg shadow-2xl outline-none"
      >
        <div className="flex items-start gap-3 border-b border-line bg-card p-5">
          <Logo job={job} size={52} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold leading-snug">{job.title}</h2>
            <Meta job={job} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.remote && <span className="chip chip-accent">Remote</span>}
              {job.salary && <span className="chip chip-good">{job.salary}</span>}
              {job.level !== undefined && <span className="chip">{LEVEL_NAMES[job.level]}</span>}
            </div>
          </div>
          <button className="btn btn-ghost !px-2" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section className="card flex items-center gap-4 p-4">
            <ScoreRing score={job.score} size={72} />
            <div>
              <p className="font-semibold">{scoreLabel(job.score)}</p>
              <p className="text-sm text-muted">
                You have {job.matched.length} of the {job.skills.length || job.matched.length} skills this posting mentions ({pct}%).
              </p>
            </div>
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

          {job.loc === "abroad" && (
            <p className="rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">
              This job is based outside {countryName(home) || "your country"} ({job.location}). Check visa, relocation or remote eligibility before you apply.
            </p>
          )}

          <AiAssistant job={job} cv={cv} enabled={ai.enabled} providers={ai.providers} onSaveNote={onSaveNote} />

          <section>
            <h3 className="label">Description</h3>
            <div className="whitespace-pre-line text-[15px] leading-relaxed">
              {job.description ? <Highlighted text={job.description} matched={job.matched} missing={job.missing} /> : <span className="text-muted">No description provided. Open the original posting for details.</span>}
            </div>
            {job.description.length >= 3900 && <p className="mt-2 text-xs text-muted">Description shortened. See the full posting on {job.source}.</p>}
          </section>
        </div>

        <div className="space-y-3 border-t border-line bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full whitespace-nowrap sm:w-auto">
              Apply on {job.source} ↗
            </a>
            {stage ? (
              <select className="input !w-auto" value={stage} onChange={(e) => onStage(e.target.value as Stage)} aria-label="Application stage">
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <button className="btn" onClick={onSave}>
                Save to tracker
              </button>
            )}
            {stage && (
              <button className="btn btn-ghost text-muted" onClick={onSave}>
                Remove
              </button>
            )}
            <button className="btn btn-ghost ml-auto text-muted" onClick={() => { onHide(); onClose(); }}>
              Not interested
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
