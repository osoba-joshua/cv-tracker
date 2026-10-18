"use client";
import { BarChart3, Columns3, Command, Compass, FileText, Moon, Search, Settings as Cog, Sun } from "lucide-react";
import { ENGINE_MODE } from "@/lib/engine";
import { AppLink, usePath } from "@/lib/nav";
import { useApp } from "@/lib/store";
import Logo from "./Logo";

export const NAV = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/tracker", label: "Tracker", icon: Columns3 },
  { href: "/cv", label: "My CV", icon: FileText },
] as const;

export default function Header() {
  const path = usePath();
  const { trackedList, setSettings, setPaletteOpen, newCount, dark } = useApp();
  const due = trackedList.filter((t) => t.followUp && t.stage !== "rejected" && t.stage !== "offer" && t.followUp <= new Date().toISOString().slice(0, 10)).length;

  return (
    <header className="glass sticky top-0 z-40 border-b border-line pt-[env(safe-area-inset-top)] no-print">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <AppLink href="/" className="mr-3 shrink-0 rounded-lg" aria-label="CV Tracker home">
          <Logo />
        </AppLink>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            const badge = href === "/tracker" ? trackedList.length : href === "/" ? newCount : 0;
            return (
              <AppLink
                key={href}
                prefetch={ENGINE_MODE === "local" ? false : undefined}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                  active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <Icon size={16} strokeWidth={2.2} />
                {label}
                {badge > 0 && (
                  <span className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${href === "/" ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted"}`}>{badge}</span>
                )}
                {href === "/tracker" && due > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-bad ring-2 ring-bg" aria-label={`${due} follow-ups due`} />}
              </AppLink>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden h-9 w-64 cursor-pointer items-center gap-2 rounded-xl border border-line bg-card px-3 text-sm text-muted transition-colors hover:border-line-strong lg:flex"
            aria-label="Open command palette"
          >
            <Search size={15} />
            <span className="flex-1 text-left">Search or jump to…</span>
            <span className="kbd">
              <Command size={10} />K
            </span>
          </button>
          <button className="btn btn-ghost btn-icon lg:hidden" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">
            <Search size={18} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setSettings((s) => ({ ...s, theme: dark ? "light" : "dark" }))}
            aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <AppLink href="/settings" className={`btn btn-ghost btn-icon ${path === "/settings" ? "!bg-accent-soft !text-accent" : ""}`} aria-label="Settings">
            <Cog size={18} />
          </AppLink>
        </div>
      </div>
    </header>
  );
}
