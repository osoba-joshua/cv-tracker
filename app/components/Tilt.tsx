"use client";
import { useRef, type ReactNode } from "react";

/** Tilts its content a few degrees toward the pointer (mouse only). Does nothing for touch or reduced motion. */
export default function Tilt({ children, max = 4, className = "" }: { children: ReactNode; max?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || document.documentElement.dataset.effects === "off") return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1400px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={reset} className={className} style={{ transition: "transform .25s ease-out", willChange: "transform" }}>
      {children}
    </div>
  );
}
