"use client";

export type Tab = "discover" | "tracker";

export default function Header({
  tab,
  setTab,
  trackedCount,
  hasProfile,
  onReset,
  theme,
  toggleTheme,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  trackedCount: number;
  hasProfile: boolean;
  onReset: () => void;
  theme: string;
  toggleTheme: () => void;
}) {
  const tabBtn = (id: Tab, label: string, badge?: number) => (
    <button
      onClick={() => setTab(id)}
      aria-current={tab === id ? "page" : undefined}
      className={`relative cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        tab === id ? "bg-accent-soft text-accent" : "text-muted hover:text-fg"
      }`}
    >
      {label}
      {!!badge && <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-fg">{badge}</span>}
    </button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <button onClick={() => setTab("discover")} className="mr-1 flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap font-semibold sm:mr-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-fg" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
          <span className="hidden sm:inline">CV Tracker</span>
        </button>
        <nav className="flex items-center gap-1" aria-label="Main">
          {tabBtn("discover", "Discover")}
          {tabBtn("tracker", "Tracker", trackedCount)}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          {hasProfile && (
            <button className="btn btn-ghost whitespace-nowrap !px-2.5 text-muted" onClick={onReset}>
              New CV
            </button>
          )}
          <button className="btn btn-ghost !px-2.5" onClick={toggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
            {theme === "dark" ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
