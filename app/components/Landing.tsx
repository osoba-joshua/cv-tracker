"use client";
import { useRef, useState } from "react";
import { CountrySelect } from "./LocationPanel";

export default function Landing({
  busy,
  error,
  onFile,
  onText,
  onSample,
  country,
  onCountry,
  aiEnabled,
}: {
  busy: boolean;
  error: string;
  onFile: (f: File) => void;
  onText: (t: string) => void;
  onSample: () => void;
  country: string;
  onCountry: (c: string) => void;
  aiEnabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");

  return (
    <div id="main" className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:pt-20">
      <div className="text-center">
        <span className="chip chip-accent">Free · no account · your CV stays on your device</span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
          Find the jobs that <span className="text-accent">actually fit</span> your CV
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Drop in your CV. We scan hundreds of live postings, rank them by how well your skills match, and show you exactly what you&apos;re missing.
        </p>
      </div>

      <div className="mx-auto mt-8 flex max-w-sm items-center gap-3">
        <label htmlFor="home" className="shrink-0 text-sm font-medium">
          I&apos;m based in
        </label>
        <CountrySelect id="home" value={country} onChange={onCountry} />
      </div>

      <div className="mt-5">
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
        {aiEnabled && (
          <p className="mt-3 text-center text-xs text-muted">
            AI is on: your CV text is sent to the AI provider you configured to read it and to power the job tools. Nothing is stored on a server.
          </p>
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
          ["2", "We scan live jobs", "Remote and local boards, filtered to jobs you can actually take from your country."],
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
