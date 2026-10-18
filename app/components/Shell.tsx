"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/store";
import CommandPalette from "./CommandPalette";
import Header from "./Header";
import JobDrawer from "./JobDrawer";
import MobileNav from "./MobileNav";
import Shortcuts from "./Shortcuts";
import ToastHost from "./ToastHost";

/** The frame around every screen: header, mobile tab bar, command palette, job panel and toasts. */
export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { ready, profile, paletteOpen, setPaletteOpen, helpOpen, setHelpOpen, selected } = useApp();

  // Ctrl/Cmd+K opens the command palette from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [paletteOpen, setPaletteOpen]);

  // Vim-style navigation: press g, then d / i / t / c / s
  useEffect(() => {
    let armed = 0;
    const routes: Record<string, string> = { d: "/", i: "/insights", t: "/tracker", c: "/cv", s: "/settings" };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable) return;
      if (armed && Date.now() - armed < 900 && routes[e.key]) {
        e.preventDefault();
        e.stopImmediatePropagation(); // don't let "s" also save a job on Discover
        armed = 0;
        router.push(routes[e.key]);
        return;
      }
      armed = e.key === "g" ? Date.now() : 0;
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [router]);

  // Spotlight: tell the hovered card where the pointer is so its glow can follow
  useEffect(() => {
    const on = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(".card-hover");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", on, { passive: true });
    return () => document.removeEventListener("pointermove", on);
  }, []);

  // The marketing landing page (home without a CV) brings its own navigation.
  const landing = path === "/" && ready && !profile;
  const showChrome = !landing;

  return (
    <>
      {showChrome && <Header />}
      <div id="main" className={showChrome ? "pb-24 md:pb-0" : ""}>
        {children}
      </div>
      {showChrome && <MobileNav />}
      {paletteOpen && <CommandPalette />}
      {helpOpen && <Shortcuts onClose={() => setHelpOpen(false)} />}
      {selected && <JobDrawer />}
      <ToastHost />
    </>
  );
}
