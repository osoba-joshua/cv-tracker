"use client";
import { useEffect } from "react";

const KEYS: [string, string][] = [
  ["j / k", "Next / previous job"],
  ["Enter", "Open the highlighted job"],
  ["s", "Save the highlighted job"],
  ["x", "Hide the highlighted job"],
  ["/", "Focus search"],
  ["Esc", "Close a panel"],
  ["?", "Show or hide this help"],
];

export default function Shortcuts({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div className="backdrop absolute inset-0 bg-black/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" className="card relative w-full max-w-sm p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Keyboard shortcuts</h2>
          <button className="btn btn-ghost !px-2" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          {KEYS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between gap-4">
              <dt>
                <kbd className="rounded border border-line bg-bg px-1.5 py-0.5 font-mono text-xs">{k}</kbd>
              </dt>
              <dd className="text-muted">{d}</dd>
            </div>
          ))}
        </dl>
        <h3 className="label mt-5">Search tips</h3>
        <ul className="space-y-1 text-sm text-muted">
          <li>
            <code className="rounded bg-bg px-1">react developer</code> both words must match
          </li>
          <li>
            <code className="rounded bg-bg px-1">&quot;product manager&quot;</code> an exact phrase
          </li>
          <li>
            <code className="rounded bg-bg px-1">-senior</code> leave out a word
          </li>
        </ul>
      </div>
    </div>
  );
}
