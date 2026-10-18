"use client";
import { useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Building2, Check, Clock, DollarSign, Globe, Lightbulb, MapPin, Search, Sparkles, Target, TrendingUp, Upload, Wifi, Zap } from "lucide-react";
import { computeInsights } from "@/lib/insights";
import { useApp } from "@/lib/store";
import { BarList, Donut, Histogram } from "./Charts";
import { Logo } from "./JobCard";

function Card({ icon: Icon, title, sub, children, className = "" }: { icon: typeof Zap; title: string; sub?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Icon size={17} /></span>
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function NeedCv({ what }: { what: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent"><Upload size={24} /></span>
      <h1 className="mt-5 text-xl font-semibold">Upload your CV first</h1>
      <p className="mt-2 text-muted">{what}</p>
      <Link href="/" className="btn btn-primary btn-lg mt-6">Upload your CV</Link>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof Zap; label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted"><Icon size={14} /> {label}</div>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export default function InsightsView() {
  const router = useRouter();
  const { ready, profile, setProfile, data, searching, hiddenSet, showAbroad, filters, setFilters, toast, loc, markVisited } = useApp();
  useEffect(() => {
    if (ready && profile && data) markVisited("insights");
  }, [ready, profile, data, markVisited]);

  const jobs = useMemo(() => (data ? data.results.filter((j) => !hiddenSet.has(j.id) && (showAbroad || j.loc !== "abroad")) : []), [data, hiddenSet, showAbroad]);
  const ins = useMemo(() => (profile ? computeInsights(jobs, profile) : null), [jobs, profile]);

  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-8"><div className="skeleton h-40 rounded-2xl" /></div>;
  if (!profile) return <NeedCv what="Insights are built from the jobs that match your CV: skill gaps, salaries, who's hiring and more." />;
  if (!data || !ins) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <div className="skeleton h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
        <p className="text-sm text-muted">{searching ? "Crunching the numbers…" : "No results yet."}</p>
      </div>
    );
  }

  const pct = (n: number) => (ins.total ? `${Math.round((n / ins.total) * 100)}%` : "0%");
  const addSkill = (skill: string) => {
    if (profile.skills.some((s) => s.toLowerCase() === skill.toLowerCase())) return;
    setProfile({ ...profile, skills: [...profile.skills, skill] });
    toast(`Added ${skill} to your profile. Results are re-ranking.`, { tone: "success" });
  };
  const findJobs = (skill: string) => {
    setFilters({ ...filters, q: skill });
    router.push("/");
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-3xl"><BarChart3 className="text-accent" size={26} /> Insights</h1>
        <p className="mt-1 text-sm text-muted">
          Based on {ins.total} jobs matched to your profile{loc.country && !loc.abroad ? " that you can take from your country" : ""}. Update your skills or location and this refreshes.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi icon={Target} label="Matching jobs" value={ins.total} />
        <Kpi icon={Zap} label="Strong matches" value={ins.strong} sub={`${pct(ins.strong)} of results`} />
        <Kpi icon={Wifi} label="Remote" value={pct(ins.remote)} sub={`${ins.remote} jobs`} />
        <Kpi icon={DollarSign} label="Salary listed" value={pct(ins.withSalary)} sub={`${ins.withSalary} jobs`} />
        <Kpi icon={Clock} label="Posted this week" value={ins.postedWeek} sub={pct(ins.postedWeek)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card icon={Lightbulb} title="Skills to learn next" sub="Asked for by relevant jobs but missing from your CV. “Unlocks” = jobs where it's the only thing missing." className="lg:col-span-2">
          {ins.skillGaps.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No clear gaps. You already cover what these jobs ask for.</p>
          ) : (
            <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              {ins.skillGaps.map((g) => {
                const max = ins.skillGaps[0].jobs;
                return (
                  <li key={g.skill} className="rounded-xl p-2.5 hover:bg-surface-2/60">
                    <div className="mb-1.5 flex items-center gap-2 text-sm">
                      <span className="font-medium">{g.skill}</span>
                      {g.unlocks > 0 && <span className="chip chip-accent !py-0 text-[11px]"><Sparkles size={10} /> unlocks {g.unlocks}</span>}
                      <span className="ml-auto text-xs tabular-nums text-muted">{g.jobs} jobs</span>
                      <button className="btn btn-ghost btn-icon !h-7 !w-7 text-muted hover:!text-good" onClick={() => addSkill(g.skill)} title="I already have this skill" aria-label={`I have ${g.skill}`}><Check size={15} /></button>
                      <button className="btn btn-ghost btn-icon !h-7 !w-7 text-muted hover:!text-accent" onClick={() => findJobs(g.skill)} title="Find jobs that ask for it" aria-label={`Find jobs that ask for ${g.skill}`}><Search size={14} /></button>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full" style={{ width: `${(g.jobs / max) * 100}%`, background: "var(--warn)" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card icon={TrendingUp} title="Your skills in demand" sub="How many matching jobs ask for each skill you have.">
          <BarList items={ins.skillDemand} tone="good" empty="Add skills to your profile to see demand." />
        </Card>

        <Card icon={DollarSign} title="Salary range" sub={ins.salary ? `Top of range across ${ins.salary.n} USD-listed jobs. Median ${`$${Math.round(ins.salary.median / 1000)}k`}.` : "Needs at least 5 jobs with a USD salary."}>
          {ins.salary ? (
            <>
              <Histogram buckets={ins.salary.buckets} />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[["Lowest", ins.salary.min], ["Median", ins.salary.median], ["Highest", ins.salary.max]].map(([l, v]) => (
                  <div key={l as string} className="rounded-xl bg-surface-2 py-2">
                    <p className="text-lg font-semibold tabular-nums">${Math.round((v as number) / 1000)}k</p>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{l}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted">Most listings don&apos;t show pay, so there isn&apos;t enough to chart yet.</p>
          )}
        </Card>

        <Card icon={Target} title="Roles in demand" sub="Types of role among your matches.">
          <BarList items={ins.roles} empty="No clear role pattern yet." />
        </Card>

        <Card icon={Building2} title="Who's hiring" sub="Companies with the most openings that fit you.">
          {ins.companies.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">No companies yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {ins.companies.map((c) => (
                <li key={c.name} className="flex items-center gap-3">
                  <Logo job={{ logo: c.logo, company: c.name }} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                  <span className="chip tabular-nums">{c.jobs} {c.jobs === 1 ? "job" : "jobs"}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card icon={MapPin} title="Where the jobs are" sub="Country or region each job is open to.">
          <BarList items={ins.locations} />
        </Card>

        <Card icon={Clock} title="How fresh are they" sub="When these jobs were posted.">
          <Donut items={ins.recency} />
        </Card>

        <Card icon={Globe} title="Sources" sub="Where your matches come from.">
          <BarList items={ins.sources} />
        </Card>
      </div>
    </main>
  );
}
