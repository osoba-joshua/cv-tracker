"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/store";
import { NAV } from "./Header";

/** Native-app style tab bar for phones. */
export default function MobileNav() {
  const path = usePathname();
  const { trackedList, newCount } = useApp();
  return (
    <nav
      aria-label="Main"
      className="glass fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden no-print"
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        const badge = href === "/tracker" ? trackedList.length : href === "/" ? newCount : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${active ? "text-accent" : "text-muted"}`}
          >
            <span className="relative">
              <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              {badge > 0 && (
                <span className="absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-accent px-1 text-center text-[9px] font-bold leading-4 text-accent-fg">{badge > 99 ? "99+" : badge}</span>
              )}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
