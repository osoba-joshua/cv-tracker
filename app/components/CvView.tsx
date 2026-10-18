"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Bot, CheckCircle2, Copy, FileText, KeyRound, Loader2, Sparkles, XCircle } from "lucide-react";
import { reviewCv, type Check } from "@/lib/cvReview";
import { useApp } from "@/lib/store";
import Dropzone from "./Dropzone";
import ProfilePanel from "./ProfilePanel";
import ScoreRing from "./ScoreRing";

type AiReview = { headline: string; strengths: string[]; improvements: string[]; rewrites: { before: string; after: string }[]; keywords: string[] };

const ICON = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle } as const;
const COLOR = { pass: "var(--good)", warn: "var(--warn)", fail: "var(--bad)" } as const;

function Group({ title, items, defaultOpen }: { title: string; items: Check[]; defaultOpen: boolean }) {
  if (!items.length) return null;
  return (
    <details open={defaultOpen} className="group">
      <summary className="mb-2 flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
        {title} <span className="chip tabular-nums">{items.length}</span>
      </summary>
      <ul className="space-y-2">
        {items.map((c) => {
          const Icon = ICON[c.status];
          return (
            <li key={c.id} className="flex gap-3 rounded-xl border border-line bg-card p-3.5">
              <Icon size={19} className="mt-0.5 shrink-0" style={{ color: COLOR[c.status] }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <p className="text-sm font-semibold">{c.label}</p>
                  <p className="text-xs text-muted">{c.detail}</p>
                  {c.status !== "pass" && <span className="ml-auto text-[11px] font-semibold text-accent">+{Math.round(c.weight * (c.status === "fail" ? 1 : 0.5))} pts available</span>}
                </div>
                {c.status !== "pass" && c.tip && <p className="mt-1 text-sm leading-relaxed text-fg-2">{c.tip}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export default function CvView() {
  const { ready, profile, cvText, parsing, parseError, onFile, onText, loadSample, ai, toast, markVisited } = useApp();
  useEffect(() => {
    if (ready && profile && cvText) markVisited("cv");
  }, [ready, profile, cvText, markVisited]);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<AiReview | null>(null);
  const [aiError, setAiError] = useState("");

  const result = useMemo(() => (cvText ? reviewCv(cvText, profile) : null), [cvText, profile]);

  async function runAi() {
    if (!profile) return;
    setBusy(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai/cv", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cv: cvText, roles: profile.titles }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "AI review failed");
      setReview(json.result);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI review failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-8"><div className="skeleton h-48 rounded-2xl" /></div>;

  if (!profile) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent"><FileText size={24} /></span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Upload your CV</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">Get an instant health check with specific, prioritised fixes, and find jobs that fit.</p>
        <div className="mt-8 text-left"><Dropzone busy={parsing} error={parseError} onFile={onFile} onText={onText} onSample={loadSample} /></div>
      </main>
    );
  }

  const fails = result?.checks.filter((c) => c.status === "fail") ?? [];
  const warns = result?.checks.filter((c) => c.status === "warn") ?? [];
  const passes = result?.checks.filter((c) => c.status === "pass") ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-3xl"><FileText className="text-accent" size={26} /> My CV</h1>
        <p className="mt-1 text-sm text-muted">A private health check, run entirely in your browser. No AI needed.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          {result ? (
            <>
              <section className="card flex flex-col items-center gap-5 p-6 sm:flex-row">
                <ScoreRing score={result.score} size={120} />
                <div className="text-center sm:text-left">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">CV health score</p>
                  <p className="text-2xl font-semibold tracking-tight">{result.grade}</p>
                  <p className="mt-1 text-sm text-muted">{passes.length} of {result.checks.length} checks passed. {fails.length + warns.length > 0 ? "Fix the items below to climb higher." : "Nothing left to fix."}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                    <span className="chip">{result.stats.words} words</span>
                    <span className="chip">{result.stats.bullets} bullets</span>
                    <span className="chip">{result.stats.metrics} metrics</span>
                    <span className="chip">{result.stats.verbs} action verbs</span>
                  </div>
                </div>
              </section>
              <div className="space-y-5">
                <Group title="Fix these first" items={fails} defaultOpen />
                <Group title="Could be better" items={warns} defaultOpen />
                <Group title="Looking good" items={passes} defaultOpen={false} />
              </div>
            </>
          ) : (
            <section className="card p-6 text-center">
              <p className="font-semibold">We don&apos;t have the text of your CV in this browser</p>
              <p className="mt-1 text-sm text-muted">Replace your CV on the right to run the health check.</p>
            </section>
          )}

          <section className="card p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Bot size={18} /></span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">AI review</h2>
                <p className="text-xs text-muted">Specific rewrites of your own lines, plus keywords for your target roles. Never invents experience.</p>
              </div>
              {ai.enabled && cvText && (
                <button className="btn btn-primary shrink-0" onClick={runAi} disabled={busy}>
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} {review ? "Redo" : "Review my CV"}
                </button>
              )}
            </div>
            {ai.enabled === false && (
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-line-strong p-4 text-sm">
                <KeyRound size={18} className="mt-0.5 shrink-0 text-accent" />
                <p className="leading-relaxed text-muted">Add a free Gemini or Groq key to your <code className="rounded bg-surface-2 px-1">.env</code> file and restart to unlock AI rewrites. The README has the 2-minute setup.</p>
              </div>
            )}
            {busy && <div className="space-y-2.5"><div className="skeleton h-4 w-3/4 rounded" /><div className="skeleton h-4 w-full rounded" /><div className="skeleton h-4 w-5/6 rounded" /></div>}
            {aiError && <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{aiError}</p>}
            {review && !busy && (
              <div className="space-y-5">
                <p className="text-sm font-medium">{review.headline}</p>
                {review.strengths.length > 0 && (
                  <div><h3 className="label">What works</h3><ul className="space-y-1.5 text-sm">{review.strengths.map((s, i) => <li key={i} className="flex gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-good" /> {s}</li>)}</ul></div>
                )}
                {review.improvements.length > 0 && (
                  <div><h3 className="label">Improve next</h3><ol className="space-y-1.5 text-sm">{review.improvements.map((s, i) => <li key={i} className="flex gap-2"><ArrowRight size={16} className="mt-0.5 shrink-0 text-accent" /> {s}</li>)}</ol></div>
                )}
                {review.rewrites.length > 0 && (
                  <div>
                    <h3 className="label">Suggested rewrites</h3>
                    <ul className="space-y-3">
                      {review.rewrites.map((r, i) => (
                        <li key={i} className="overflow-hidden rounded-xl border border-line">
                          <p className="bg-bad-soft/60 px-3 py-2 text-sm text-fg-2 line-through decoration-bad/40">{r.before}</p>
                          <div className="flex items-start gap-2 bg-good-soft/60 px-3 py-2 text-sm">
                            <p className="flex-1">{r.after}</p>
                            <button className="btn btn-ghost btn-icon !h-7 !w-7 shrink-0" aria-label="Copy rewrite" onClick={() => { try { navigator.clipboard.writeText(r.after); toast("Copied", { tone: "success" }); } catch {} }}><Copy size={13} /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {review.keywords.length > 0 && (
                  <div><h3 className="label">Keywords to feature</h3><div className="flex flex-wrap gap-1.5">{review.keywords.map((k) => <span key={k} className="chip chip-good">{k}</span>)}</div></div>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <ProfilePanel idSuffix="-cv" />
          <section className="card p-4">
            <h2 className="mb-3 font-semibold">Replace your CV</h2>
            <Dropzone compact busy={parsing} error={parseError} onFile={onFile} onText={onText} />
          </section>
          {cvText && (
            <details className="card p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold">View the text we read</summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-mono text-xs leading-relaxed text-fg-2">{cvText}</pre>
            </details>
          )}
        </aside>
      </div>
    </main>
  );
}
