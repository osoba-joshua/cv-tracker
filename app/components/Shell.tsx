"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
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
