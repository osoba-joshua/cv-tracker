import type { Bar } from "@/lib/insights";

/** Horizontal bars with labels. Dependency-free and fully accessible (a real list with text values). */
export function BarList({ items, tone = "accent", empty = "Not enough data yet" }: { items: Bar[]; tone?: "accent" | "good" | "warn"; empty?: string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (!items.length || items.every((i) => i.value === 0)) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  const color = tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--accent)";
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate font-medium">{i.label}</span>
            <span className="shrink-0 tabular-nums text-muted">{i.sub ?? i.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${i.label}: ${i.value}`}>
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max((i.value / max) * 100, i.value ? 4 : 0)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Simple column histogram. */
export function Histogram({ buckets }: { buckets: Bar[] }) {
  const max = Math.max(...buckets.map((b) => b.value), 1);
  return (
    <div className="flex h-40 items-end gap-2" role="img" aria-label="Salary distribution">
      {buckets.map((b) => (
        <div key={b.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${b.sub}: ${b.value} jobs`}>
          <span className="text-[11px] font-medium tabular-nums text-muted opacity-0 transition-opacity group-hover:opacity-100">{b.value}</span>
          <div
            className="w-full rounded-t-lg transition-all duration-700"
            style={{ height: `${Math.max((b.value / max) * 100, b.value ? 6 : 1)}%`, background: "linear-gradient(180deg, var(--accent), hsl(calc(var(--hue) + 40) 85% 62%))", opacity: b.value ? 1 : 0.2 }}
          />
          <span className="text-[10px] tabular-nums text-muted">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Ring split into proportional segments. */
export function Donut({ items, size = 132 }: { items: Bar[]; size?: number }) {
  const total = items.reduce((n, i) => n + i.value, 0);
  const r = (size - 18) / 2;
  const c = 2 * Math.PI * r;
  const colors = ["var(--accent)", "hsl(calc(var(--hue) + 40) 80% 62%)", "var(--warn)", "var(--line-strong)"];
  // Where each segment starts around the ring
  const starts = items.map((_, k) => items.slice(0, k).reduce((n, i) => n + (i.value / total) * c, 0));
  if (!total) return <p className="py-6 text-center text-sm text-muted">Not enough data yet</p>;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} className="shrink-0 -rotate-90" role="img" aria-label="Posting freshness">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={14} />
        {items.map((i, k) => {
          const len = (i.value / total) * c;
          return (
            <circle
              key={i.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={colors[k % colors.length]}
              strokeWidth={14}
              strokeDasharray={`${Math.max(len - 2, 0)} ${c}`}
              strokeDashoffset={-starts[k]}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <ul className="space-y-2 text-sm">
        {items.map((i, k) => (
          <li key={i.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[k % colors.length] }} />
            <span className="text-muted">{i.label}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">{i.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
