"use client";
import { useRef, useState } from "react";
import { ClipboardPaste, FileUp, Loader2, Sparkles, UploadCloud } from "lucide-react";

/** Drag-and-drop CV upload with paste-text and sample options. Used on the landing page and the CV screen. */
export default function Dropzone({
  busy,
  error,
  onFile,
  onText,
  onSample,
  compact = false,
}: {
  busy: boolean;
  error: string;
  onFile: (f: File) => void;
  onText: (t: string) => void;
  onSample?: () => void;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");

  return (
    <div>
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
          className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed text-center transition-all duration-200 ${
            compact ? "px-5 py-7" : "px-6 py-10 sm:py-12"
          } ${drag ? "scale-[1.01] border-accent bg-accent-soft" : "border-line-strong bg-card/60 hover:border-accent/60"}`}
        >
          <div className={`grid place-items-center rounded-2xl bg-accent-soft text-accent ${compact ? "h-11 w-11" : "h-14 w-14"}`} aria-hidden>
            {busy ? <Loader2 size={compact ? 20 : 26} className="animate-spin" /> : <UploadCloud size={compact ? 20 : 26} />}
          </div>
          <div>
            <p className="font-semibold">{busy ? "Reading your CV…" : drag ? "Drop it here" : "Drop your CV here"}</p>
            <p className="mt-0.5 text-sm text-muted">PDF or text file, up to 5 MB</p>
          </div>
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
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button className="btn btn-primary" disabled={busy} onClick={() => input.current?.click()}>
              <FileUp size={16} /> Choose file
            </button>
            <button className="btn" disabled={busy} onClick={() => setPaste(true)}>
              <ClipboardPaste size={16} /> Paste text
            </button>
            {onSample && (
              <button className="btn btn-ghost text-muted" disabled={busy} onClick={onSample}>
                <Sparkles size={16} /> Try a sample
              </button>
            )}
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
            rows={compact ? 8 : 10}
            className="input resize-y font-mono text-[13px] leading-relaxed"
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
        <p role="alert" className="mt-3 rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}
