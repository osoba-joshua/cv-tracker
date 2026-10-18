"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

const KEYS: [string, string][] = [
  ["Ctrl / ⌘ + K", "Open the command palette"],
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
      <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" className="pop card relative w-full max-w-sm p-5" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Keyboard shortcuts</h2>
          <button className="btn btn-ghost btn-icon !h-8 !w-8" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <dl className="space-y-2.5 text-sm">
          {KEYS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between gap-4">
              <dt>
                <kbd className="kbd !px-2">{k}</kbd>
              </dt>
              <dd className="text-muted">{d}</dd>
            </div>
          ))}
        </dl>
        <h3 className="label mt-6">Search tips</h3>
        <ul className="space-y-1.5 text-sm text-muted">
          <li><code className="rounded bg-surface-2 px-1.5">react developer</code> both words must match</li>
          <li><code className="rounded bg-surface-2 px-1.5">&quot;product manager&quot;</code> an exact phrase</li>
          <li><code className="rounded bg-surface-2 px-1.5">-senior</code> leave out a word</li>
          <li>Press <kbd className="kbd">Enter</kbd> to search the job boards for anything</li>
        </ul>
      </div>
    </div>
  );
}
