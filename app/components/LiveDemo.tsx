"use client";
import { useLayoutEffect, useRef, useState } from "react";
import { MousePointerClick } from "lucide-react";
import ScoreRing from "./ScoreRing";

const SKILLS = ["React", "TypeScript", "Next.js", "Node.js", "SQL", "Python", "Docker", "Figma"];

const JOBS = [
  { id: "fe", title: "Frontend Engineer", company: "Northwind Labs", needs: ["React", "TypeScript", "Next.js"] },
  { id: "fs", title: "Full-Stack Developer", company: "Orbit Studio", needs: ["React", "Node.js", "SQL", "Docker"] },
  { id: "pd", title: "Product Designer", company: "Lumen Health", needs: ["Figma", "Research", "Prototyping"] },
  { id: "da", title: "Data Analyst", company: "Helix Analytics", needs: ["Python", "SQL", "Tableau"] },
  { id: "do", title: "DevOps Engineer", company: "Nimbus Cloud", needs: ["Docker", "AWS", "Linux"] },
];

/** A tiny, honest version of the real scoring so people can feel how it works before uploading anything. */
function score(needs: string[], have: Set<string>) {
  const got = needs.filter((n) => have.has(n)).length;
  return got === 0 ? 6 : Math.round((got / needs.length) * 90 + 6);
}

export default function LiveDemo() {
  const [have, setHave] = useState<Set<string>>(new Set(["React", "TypeScript"]));
  const rows = JOBS.map((j) => ({ ...j, score: score(j.needs, have) })).sort((a, b) => b.score - a.score);

  // FLIP: animate rows sliding to their new positions when the ranking changes
  const els = useRef(new Map<string, HTMLElement>());
  const tops = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    for (const r of rows) {
      const el = els.current.get(r.id);
      if (!el) continue;
      const top = el.offsetTop;
      const old = tops.current.get(r.id);
      if (old !== undefined && old !== top) {
        el.style.transition = "none";
        el.style.transform = `translateY(${old - top}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "transform .5s cubic-bezier(.2,.8,.2,1)";
          el.style.transform = "";
        });
      }
      tops.current.set(r.id, top);
    }
  });

  const toggle = (s: string) =>
    setHave((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  return (
    <section className="mx-auto max-w-5xl px-4 pb-20" aria-labelledby="demo-title">
      <div className="mx-auto max-w-2xl text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-accent">
          <MousePointerClick size={15} /> Try it right now
        </p>
        <h2 id="demo-title" className="section-title mt-2">Your skills decide the ranking</h2>
        <p className="mt-3 text-muted">Tap the skills you have and watch the jobs re-rank instantly. This is the same idea that scores real postings against your CV.</p>
      </div>

      <div className="card mt-10 grid gap-6 p-5 md:grid-cols-[minmax(0,260px)_1fr] md:p-7" style={{ boxShadow: "var(--shadow-md)" }}>
        <div>
          <p className="label">Your skills</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose your skills">
            {SKILLS.map((s) => {
              const on = have.has(s);
              return (
                <button
                  key={s}
                  aria-pressed={on}
                  onClick={() => toggle(s)}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 ${
                    on ? "border-transparent bg-accent text-accent-fg" : "border-line-strong bg-card text-muted hover:border-accent hover:text-fg"
                  }`}
                  style={on ? { boxShadow: "0 4px 14px -4px var(--accent-ring)" } : undefined}
                >
                  {on ? "✓ " : ""}
                  {s}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted">{have.size} of {SKILLS.length} selected</p>
        </div>

        <ul className="relative space-y-2.5" aria-live="polite">
          {rows.map((r) => (
            <li key={r.id} ref={(el) => { if (el) els.current.set(r.id, el); }} className="rounded-2xl border border-line bg-card p-3.5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-sm font-bold text-accent">{r.company[0]}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-snug">{r.title}</p>
                  <p className="truncate text-xs text-muted">{r.company}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {r.needs.map((n) => (
                      <span key={n} className={`chip !py-0 text-[11px] ${have.has(n) ? "chip-good" : "chip-warn"}`}>
                        {have.has(n) ? "✓ " : ""}
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
                <ScoreRing score={r.score} size={46} none={r.score <= 6} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
