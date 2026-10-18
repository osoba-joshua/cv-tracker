"use client";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

/** Bottom sheet for phones (filters, profile). */
export default function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:hidden">
      <div className="backdrop absolute inset-0 bg-black/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="sheet relative flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-bg" style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">{children}</div>
        {footer && <div className="border-t border-line bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
