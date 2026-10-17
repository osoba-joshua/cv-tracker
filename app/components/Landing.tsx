"use client";
import { useRef, useState } from "react";

export default function Landing({
  busy,
  error,
  onFile,
  onText,
  onSample,
}: {
  busy: boolean;
  error: string;
  onFile: (f: File) => void;
  onText: (t: string) => void;
  onSample: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:pt-20">
      <div className="text-center">
        <span className="chip chip-accent">Free · no account · your CV is never stored</span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
          Find the jobs that <span className="text-accent">actually fit</span> your CV
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Drop in your CV. We scan hundreds of live postings, rank them by how well your skills match, and show you exactly what you&apos;re missing.
        </p>
      </div>

      <div className="mt-10">
        {!paste ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              if (f) onFile(f);
            }}
            className={`card flex flex-col items-center gap-3 border-2 border-dashed px-6 py-12 text-center transition-colors ${
              drag ? "border-accent bg-accent-soft" : ""
            }`}
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
              </svg>
            </div>
            <p className="font-semibold">{busy ? "Reading your CV…" : "Drag & drop your CV here"}</p>
            <p className="text-sm text-muted">PDF or text file, up to 5 MB</p>
            <input
              ref={input}
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain"
              className="sr-only"
              aria-label="Upload CV"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <button className="btn btn-primary" disabled={busy} onClick={() => input.current?.click()}>
                Choose file
              </button>
              <button className="btn" disabled={busy} onClick={() => setPaste(true)}>
                Paste text instead
              </button>
              <button className="btn btn-ghost text-muted" disabled={busy} onClick={onSample}>
                Try a sample CV
              </button>
            </div>
          </div>
        ) : (
          <div className="card p-4">
            <label htmlFor="cv-text" className="label">
              Paste your CV
            </label>
            <textarea
              id="cv-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              className="input resize-y font-mono text-[13px]"
              placeholder="Paste the text of your CV here…"
              autoFocus
            />
            <div className="mt-3 flex gap-2">
              <button className="btn btn-primary" disabled={busy || text.trim().length < 30} onClick={() => onText(text)}>
                {busy ? "Reading…" : "Find jobs"}
              </button>
              <button className="btn" onClick={() => setPaste(false)}>
                Back to upload
              </button>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">
            {error}
          </p>
        )}
      </div>

      <ol className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          ["1", "We read your CV", "Skills, roles and seniority are detected. You can edit anything we got wrong."],
          ["2", "We scan live jobs", "Remote OK, Remotive, Jobicy and Arbeitnow, refreshed hourly."],
          ["3", "You get a ranked list", "See your match score, the skills you have, and the gaps to close."],
        ].map(([n, t, d]) => (
          <li key={n} className="card p-4">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{n}</span>
            <h3 className="mt-3 font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
