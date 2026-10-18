"use client";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useApp } from "@/lib/store";

export default function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((t) => {
        const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? AlertTriangle : Info;
        return (
          <div
            key={t.id}
            role="status"
            className="pop pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-line-strong bg-fg py-2.5 pl-3.5 pr-2.5 text-sm text-bg shadow-lg"
          >
            <Icon size={17} className={t.tone === "success" ? "text-[#4ade80]" : t.tone === "error" ? "text-[#f87171]" : "opacity-70"} />
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.action && (
              <button
                className="cursor-pointer rounded-lg px-2 py-1 text-sm font-semibold underline-offset-2 hover:underline"
                style={{ color: "var(--accent-hover)" }}
                onClick={() => {
                  t.action!.run();
                  dismissToast(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button className="cursor-pointer rounded-lg p-1 opacity-60 hover:opacity-100" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
