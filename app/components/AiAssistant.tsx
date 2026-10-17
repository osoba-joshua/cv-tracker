"use client";
import { useState } from "react";
import type { ScoredJob } from "@/lib/types";

type Task = "fit" | "cover" | "prep" | "tweak";
type Tone = "professional" | "friendly" | "concise";
type Res = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const TASKS: { id: Task; label: string; blurb: string }[] = [
  { id: "fit", label: "Fit check", blurb: "An honest read on how well your CV fits this job, with next steps." },
  { id: "cover", label: "Cover letter", blurb: "A tailored cover letter built only from facts in your CV." },
  { id: "prep", label: "Interview prep", blurb: "The questions you're most likely to get, with answer tips from your CV." },
  { id: "tweak", label: "Tailor CV", blurb: "A tailored summary, stronger bullets and keywords for this job." },
];

// Remember results for the session so reopening a job doesn't spend free quota again.
const memo = new Map<string, { result: Res; provider: string; n: number }>();

function copy(text: string) {
  try {
    navigator.clipboard.writeText(text);
  } catch {}
}

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn !px-2.5 !py-1 text-xs"
      onClick={() => {
        copy(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

const List = ({ items, icon }: { items: string[]; icon: string }) => (
  <ul className="space-y-1.5 text-sm">
    {items.map((s, i) => (
      <li key={i} className="flex gap-2">
        <span aria-hidden className="mt-0.5 shrink-0">{icon}</span>
        <span>{s}</span>
      </li>
    ))}
  </ul>
);

const VERDICT: Record<string, [string, string]> = {
  strong: ["Strong fit", "chip-good"],
  good: ["Good fit", "chip-accent"],
  stretch: ["A stretch", "chip-warn"],
  poor: ["Weak fit", "chip-warn"],
};

function Result({ task, r, onSaveNote, tone }: { task: Task; r: Res; onSaveNote: (t: string) => void; tone: Tone }) {
  const [letter, setLetter] = useState<string>(r.letter ?? ""); // parent remounts this when a new result arrives

  if (task === "fit") {
    const [label, cls] = VERDICT[r.verdict] ?? VERDICT.good;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`chip ${cls}`}>{label}</span>
          <p className="text-sm font-medium">{r.headline}</p>
        </div>
        {r.strengths?.length > 0 && <div><h4 className="label">Working for you</h4><List items={r.strengths} icon="✓" /></div>}
        {r.concerns?.length > 0 && <div><h4 className="label">Watch out for</h4><List items={r.concerns} icon="!" /></div>}
        {r.advice?.length > 0 && <div><h4 className="label">Next steps</h4><List items={r.advice} icon="→" /></div>}
      </div>
    );
  }
  if (task === "cover") {
    return (
      <div className="space-y-3">
        {r.subject && <p className="text-sm"><span className="text-muted">Subject: </span><strong>{r.subject}</strong></p>}
        <textarea className="input min-h-72 leading-relaxed" value={letter} onChange={(e) => setLetter(e.target.value)} aria-label={`Cover letter (${tone})`} />
        <div className="flex flex-wrap gap-2">
          <CopyBtn text={letter} label="Copy letter" />
          <button className="btn !px-2.5 !py-1 text-xs" onClick={() => onSaveNote(`Cover letter:\n${letter}`)}>
            Save to job notes
          </button>
        </div>
        <p className="text-xs text-muted">Edit freely, and replace [Your Name]. Check every claim is true before sending.</p>
      </div>
    );
  }
  if (task === "prep") {
    return (
      <ol className="space-y-2">
        {(r.questions ?? []).map((q: { q: string; why: string; tip: string }, i: number) => (
          <li key={i} className="rounded-lg border border-line bg-bg">
            <details>
              <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium">
                <span className="mr-2 text-accent">{i + 1}.</span>
                {q.q}
              </summary>
              <div className="space-y-1.5 border-t border-line px-3 py-2.5 text-sm">
                {q.why && <p className="text-muted">Why they ask: {q.why}</p>}
                {q.tip && <p>{q.tip}</p>}
              </div>
            </details>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <div className="space-y-4">
      {r.summary && (
        <div>
          <div className="flex items-center justify-between"><h4 className="label !mb-0">Tailored summary</h4><CopyBtn text={r.summary} /></div>
          <p className="mt-1.5 rounded-lg bg-bg p-3 text-sm leading-relaxed">{r.summary}</p>
        </div>
      )}
      {r.bullets?.length > 0 && (
        <div>
          <div className="flex items-center justify-between"><h4 className="label !mb-0">Stronger bullet points</h4><CopyBtn text={r.bullets.map((b: string) => `• ${b}`).join("\n")} /></div>
          <div className="mt-1.5"><List items={r.bullets} icon="•" /></div>
        </div>
      )}
      {r.keywords?.length > 0 && (
        <div>
          <h4 className="label">Keywords to include</h4>
          <div className="flex flex-wrap gap-1.5">{r.keywords.map((k: string) => <span key={k} className="chip chip-good">{k}</span>)}</div>
        </div>
      )}
      {r.missing?.length > 0 && (
        <div>
          <h4 className="label">Not on your CV (add only if true)</h4>
          <List items={r.missing} icon="?" />
        </div>
      )}
    </div>
  );
}

export default function AiAssistant({
  job,
  cv,
  enabled,
  providers,
  onSaveNote,
}: {
  job: ScoredJob;
  cv: string;
  enabled: boolean | null;
  providers: string[];
  onSaveNote: (text: string) => void;
}) {
  const [task, setTask] = useState<Task>("fit");
  const [tone, setTone] = useState<Tone>("professional");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ key: string; msg: string } | null>(null);
  const key = `${job.id}|${task}|${task === "cover" ? tone : ""}`;
  const [, bump] = useState(0);
  const cached = memo.get(key);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ai/job", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          task,
          tone,
          cv,
          job: {
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            matched: job.matched,
            missing: job.missing,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "AI request failed");
      memo.set(key, { result: json.result, provider: json.provider, n: (memo.get(key)?.n ?? 0) + 1 });
      bump((n) => n + 1);
    } catch (e) {
      setErr({ key, msg: e instanceof Error ? e.message : "AI request failed" });
    } finally {
      setBusy(false);
    }
  }

  if (enabled === null) return null;

  if (!enabled) {
    return (
      <section className="card border-dashed p-4">
        <h3 className="font-semibold">AI tools <span className="chip chip-accent ml-1">free</span></h3>
        <p className="mt-1 text-sm text-muted">
          Get a fit check, tailored cover letter, interview questions and CV tweaks for every job. It&apos;s free: add a Gemini or Groq key (no card needed) to your <code className="rounded bg-bg px-1">.env</code> file and restart. The README has the 2-minute setup.
        </p>
      </section>
    );
  }

  const cur = TASKS.find((t) => t.id === task)!;

  return (
    <section className="card p-4" aria-label="AI assistant">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">AI assistant</h3>
        <span className="chip" title="Your CV text is sent to this provider only when you press Generate">via {providers.join(" → ") || "AI"}</span>
      </div>

      <div role="tablist" className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-bg p-1 sm:grid-cols-4">
        {TASKS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={task === t.id}
            onClick={() => setTask(t.id)}
            className={`cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium ${task === t.id ? "bg-card text-fg shadow-sm" : "text-muted hover:text-fg"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {cached ? (
          <>
            <Result key={`${key}:${cached.n}`} task={task} r={cached.result} onSaveNote={onSaveNote} tone={tone} />
            <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
              {task === "cover" && (
                <select className="input !w-auto !py-1 text-xs" value={tone} onChange={(e) => setTone(e.target.value as Tone)} aria-label="Tone">
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="concise">Concise</option>
                </select>
              )}
              <button className="btn !py-1 text-xs" disabled={busy} onClick={run}>
                {busy ? "Generating…" : "Regenerate"}
              </button>
              <span className="ml-auto text-xs text-muted">via {cached.provider}</span>
            </div>
          </>
        ) : busy ? (
          <div className="space-y-2" aria-label="Generating">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-5/6 rounded" />
            <p className="pt-1 text-xs text-muted">Thinking… free models can take 10-20 seconds.</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted">{cur.blurb}</p>
            {!cv ? (
              <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">Re-upload your CV (New CV) so the AI has something to work from.</p>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                {task === "cover" && (
                  <select className="input !w-auto" value={tone} onChange={(e) => setTone(e.target.value as Tone)} aria-label="Tone">
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="concise">Concise</option>
                  </select>
                )}
                <button className="btn btn-primary" onClick={run}>
                  Generate {cur.label.toLowerCase()}
                </button>
              </div>
            )}
          </div>
        )}
        {err?.key === key && (
          <p role="alert" className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">
            {err.msg}
          </p>
        )}
      </div>
    </section>
  );
}
