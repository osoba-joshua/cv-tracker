"use client";
import { useState } from "react";
import { timeAgo, STAGES, type Stage } from "@/lib/client";
import { countryName } from "@/lib/geo";
import type { ScoredJob } from "@/lib/types";
import ScoreRing from "./ScoreRing";

export function Logo({ job, size = 44 }: { job: Pick<ScoredJob, "logo" | "company">; size?: number }) {
  const [bad, setBad] = useState(false);
  const initials = job.company.replace(/[^\p{L}\p{N} ]/gu, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const hue = [...job.company].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  if (job.logo && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={job.logo} alt="" width={size} height={size} loading="lazy" onError={() => setBad(true)} className="shrink-0 rounded-lg border border-line bg-white object-contain" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-lg text-sm font-semibold"
      style={{ width: size, height: size, background: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 55% 30%)` }}
    >
      {initials}
    </span>
  );
}

export function Meta({ job }: { job: ScoredJob }) {
  const bits = [
    job.location,
    job.jobType && job.jobType.replace(/_/g, " "),
    job.postedAt && timeAgo(job.postedAt),
  ].filter(Boolean);
  return (
    <p className="mt-0.5 text-sm text-muted">
      <span className="font-medium text-fg">{job.company}</span>
      {bits.length > 0 && <> · {bits.join(" · ")}</>}
    </p>
  );
}

export default function JobCard({
  job,
  home,
  stage,
  onOpen,
  onSave,
  onHide,
}: {
  job: ScoredJob;
  home: string; // user's country code
  stage?: Stage;
  onOpen: () => void;
  onSave: () => void;
  onHide: () => void;
}) {
  const saved = !!stage;
  const homeName = countryName(home);
  return (
    <article className="card group relative p-4 transition-shadow hover:shadow-md">
      <div className="flex gap-3">
        <Logo job={job} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug">
            <button onClick={onOpen} className="cursor-pointer text-left hover:text-accent after:absolute after:inset-0 after:content-['']">
              {job.title}
            </button>
          </h3>
          <Meta job={job} />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {job.loc === "local" && homeName && <span className="chip chip-good">In {homeName}</span>}
            {job.loc === "abroad" && homeName && <span className="chip chip-warn">Outside {homeName}</span>}
            {job.remote && <span className="chip chip-accent">Remote</span>}
            {job.salary && <span className="chip chip-good">{job.salary}</span>}
            {stage && <span className="chip chip-accent">{STAGES.find((s) => s.id === stage)?.label}</span>}
            <span className="chip">{job.source}</span>
          </div>
        </div>
        <ScoreRing score={job.score} />
      </div>

      {(job.matched.length > 0 || job.missing.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
          {job.matched.slice(0, 6).map((s) => (
            <span key={s} className="chip chip-good">
              ✓ {s}
            </span>
          ))}
          {job.matched.length > 6 && <span className="chip">+{job.matched.length - 6}</span>}
          {job.missing.slice(0, 3).map((s) => (
            <span key={s} className="chip chip-warn" title="Mentioned in the posting but not on your CV">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="relative z-10 mt-2 flex items-center justify-end gap-1">
        <button className="btn btn-ghost !px-2 text-xs" onClick={onSave} aria-pressed={saved}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
            <path d="M6 3h12v18l-6-4-6 4z" />
          </svg>
          {saved ? "Saved" : "Save"}
        </button>
        <button className="btn btn-ghost !px-2 text-xs text-muted" onClick={onHide} aria-label={`Hide ${job.title}`}>
          Not interested
        </button>
      </div>
    </article>
  );
}
