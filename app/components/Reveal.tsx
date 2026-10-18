"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fades content up the first time it scrolls into view. Renders visibly if IntersectionObserver is missing. */
export default function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(16px)", transition: `opacity .6s ${delay}ms ease-out, transform .6s ${delay}ms cubic-bezier(.2,.8,.2,1)` }}>
      {children}
    </div>
  );
}
