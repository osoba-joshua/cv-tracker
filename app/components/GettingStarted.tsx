"use client";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { useApp } from "@/lib/store";

/** A short checklist that points new users at the app's best features. Disappears when done or dismissed. */
export default function GettingStarted() {
  const { profile, loc, trackedList, onboarding, dismissOnboarding, ai, setHelpOpen } = useApp();
  if (!profile || onboarding.dismissed) return null;

  const steps = [
    { done: true, label: "Upload your CV", href: "/cv" },
    { done: !!loc.country, label: "Confirm your location", hint: "Left panel", href: "" },
    { done: trackedList.length > 0, label: "Save your first job", hint: "Tap Save on a card", href: "" },
    { done: onboarding.insights, label: "See which skills to learn", hint: "Insights", href: "/insights" },
    { done: onboarding.cv, label: "Check your CV's health", hint: "My CV", href: "/cv" },
    { done: ai.enabled === true, label: "Turn on the free AI copilot", hint: "Optional", href: "/settings" },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  return (
    <section className="card mb-4 overflow-hidden" aria-label="Getting started">
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Get the most out of CV Tracker</h2>
          <p className="text-xs text-muted">{done} of {steps.length} done</p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
        </div>
        <button className="btn btn-ghost btn-icon !h-8 !w-8 text-muted" onClick={dismissOnboarding} aria-label="Dismiss checklist">
          <X size={16} />
        </button>
      </div>
      <ul className="grid gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s) => {
          const inner = (
            <>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${s.done ? "border-transparent bg-good text-white" : "border-line-strong"}`}>
                {s.done && <Check size={12} strokeWidth={3} />}
              </span>
              <span className={`min-w-0 flex-1 text-left text-sm ${s.done ? "text-muted line-through decoration-line-strong" : "font-medium"}`}>{s.label}</span>
              {!s.done && s.href && <ArrowRight size={14} className="shrink-0 text-muted" />}
              {!s.done && !s.href && s.hint && <span className="shrink-0 text-[11px] text-muted">{s.hint}</span>}
            </>
          );
          return (
            <li key={s.label} className="bg-card">
              {s.href && !s.done ? (
                <Link href={s.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">{inner}</Link>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between border-t border-line bg-surface-2/50 px-4 py-2 text-xs text-muted">
        <span>Tip: press <kbd className="kbd">Ctrl</kbd> <kbd className="kbd">K</kbd> to jump anywhere</span>
        <button className="font-medium text-accent hover:underline" onClick={() => setHelpOpen(true)}>All shortcuts</button>
      </div>
    </section>
  );
}
