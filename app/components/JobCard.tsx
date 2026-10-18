"use client";
import { memo, useState } from "react";
import { Banknote, Bookmark, BookmarkCheck, Briefcase, Clock, EyeOff, MapPin, Sparkles } from "lucide-react";
import { timeAgo, STAGES, type Stage } from "@/lib/client";
import { countryName } from "@/lib/geo";
import type { ScoredJob } from "@/lib/types";
import ScoreRing from "./ScoreRing";

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** Wraps search terms in <mark> so you can see why a result matched. */
export function Hi({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map(esc).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-accent-soft px-0.5 text-accent">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function Logo({ job, size = 44 }: { job: Pick<ScoredJob, "logo" | "company">; size?: number }) {
  const [bad, setBad] = useState(false);
  const initials = job.company.replace(/[^\p{L}\p{N} ]/gu, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const hue = [...job.company].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  const radius = Math.round(size * 0.27);
  if (job.logo && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={job.logo} alt="" width={size} height={size} loading="lazy" onError={() => setBad(true)} className="shrink-0 border border-line bg-white object-contain" style={{ width: size, height: size, borderRadius: radius }} />;
  }
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center font-semibold"
      style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.34, background: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 55% 28%)` }}
    >
      {initials}
    </span>
  );
}

/** Location / type / posted line with small icons. */
export function MetaLine({ job, terms = [] }: { job: ScoredJob; terms?: string[] }) {
  const type = job.jobType?.replace(/_/g, " ");
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
      <span className="font-medium text-fg-2">
        <Hi text={job.company} terms={terms} />
      </span>
      <span className="inline-flex items-center gap-1">
        <MapPin size={13} /> {job.location}
      </span>
      {type && (
        <span className="inline-flex items-center gap-1 capitalize">
          <Briefcase size={13} /> {type}
        </span>
      )}
      {job.postedAt && (
        <span className="inline-flex items-center gap-1">
          <Clock size={13} /> {timeAgo(job.postedAt)}
        </span>
      )}
    </p>
  );
}

function JobCard({
  job,
  home,
  terms,
  isNew,
  active,
  index,
  stage,
  compact,
  onOpen,
  onSave,
  onHide,
}: {
  job: ScoredJob;
  home: string; // user's country code
  terms: string[];
  isNew: boolean;
  active: boolean;
  index: number;
  stage?: Stage;
  compact: boolean;
  onOpen: (id: string) => void;
  onSave: (job: ScoredJob) => void;
  onHide: (id: string) => void;
}) {
  const saved = !!stage;
  const homeName = countryName(home);
  const none = job.matched.length === 0;

  return (
    <article
      data-idx={index}
      className={`card card-hover group relative ${active ? "ring-2 ring-accent" : ""}`}
      style={{ padding: "var(--pad)" }}
    >
      <div className="flex gap-3.5">
        <Logo job={job} size={compact ? 38 : 46} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-snug sm:text-base">
            <button onClick={() => onOpen(job.id)} className="cursor-pointer text-left hover:text-accent after:absolute after:inset-0 after:content-['']">
              <Hi text={job.title} terms={terms} />
            </button>
          </h3>
          <MetaLine job={job} terms={terms} />
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {isNew && (
              <span className="chip !border-transparent !bg-accent !text-accent-fg">
                <Sparkles size={11} /> New
              </span>
            )}
            {job.salary && (
              <span className="chip chip-good">
                <Banknote size={12} /> {job.salary}
              </span>
            )}
            {job.loc === "local" && homeName && <span className="chip chip-good">In {homeName}</span>}
            {job.loc === "abroad" && homeName && <span className="chip chip-warn">Outside {homeName}</span>}
            {job.remote && <span className="chip chip-accent">Remote</span>}
            {stage && <span className="chip chip-accent">{STAGES.find((s) => s.id === stage)?.label}</span>}
            <span className="chip">{job.source}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <ScoreRing score={job.score} size={compact ? 40 : 48} none={none} />
        </div>
      </div>

      {!compact && (job.matched.length > 0 || job.missing.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
          {job.matched.slice(0, 5).map((s) => (
            <span key={s} className="chip chip-good">
              ✓ {s}
            </span>
          ))}
          {job.matched.length > 5 && <span className="chip">+{job.matched.length - 5}</span>}
          {job.missing.slice(0, 2).map((s) => (
            <span key={s} className="chip chip-warn" title="Mentioned in the posting but not on your CV">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="relative z-10 mt-2.5 flex items-center justify-end gap-1">
        <button className="btn btn-ghost btn-sm text-muted opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => onHide(job.id)} aria-label={`Hide ${job.title}`}>
          <EyeOff size={14} /> Hide
        </button>
        <button className={`btn btn-sm ${saved ? "!border-transparent !bg-accent-soft !text-accent" : ""}`} onClick={() => onSave(job)} aria-pressed={saved} aria-label={saved ? "Remove from tracker" : "Save to tracker"}>
          {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </article>
  );
}

export default memo(JobCard);
