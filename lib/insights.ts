import { countryName } from "./geo";
import type { Profile, ScoredJob } from "./types";

export type Bar = { label: string; value: number; sub?: string };

export type Insights = {
  total: number;
  strong: number;
  remote: number;
  withSalary: number;
  postedWeek: number;
  skillGaps: { skill: string; jobs: number; unlocks: number }[];
  skillDemand: Bar[];
  salary: { n: number; min: number; median: number; max: number; buckets: Bar[] } | null;
  companies: { name: string; jobs: number; logo?: string }[];
  locations: Bar[];
  recency: Bar[];
  roles: Bar[];
  sources: Bar[];
};

const ROLES: [string, RegExp][] = [
  ["Frontend", /front[\s-]?end|react|vue|angular|ui engineer|web developer/i],
  ["Backend", /back[\s-]?end|api|node|java\b|python|golang|ruby|php|\.net/i],
  ["Full-stack", /full[\s-]?stack/i],
  ["Mobile", /mobile|ios|android|react native|flutter|swift|kotlin/i],
  ["DevOps / Cloud", /devops|sre|cloud|infrastructure|platform engineer|kubernetes/i],
  ["Data / ML", /data (scientist|engineer|analyst)|machine learning|\bml\b|\bai\b|analytics|bi developer/i],
  ["Design", /designer|ux|ui\/ux|product design/i],
  ["Product", /product (manager|owner)|program manager|project manager/i],
  ["QA / Testing", /\bqa\b|quality|test(er| automation)/i],
  ["Security", /security|cyber|penetration/i],
  ["Support / Success", /support|customer success|customer service|helpdesk/i],
  ["Marketing / Sales", /marketing|seo|content|growth|sales|account executive|business development/i],
];

const top = (m: Map<string, number>, n: number): Bar[] =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([label, value]) => ({ label, value }));

const fmt = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : `$${Math.round(n / 1000)}k`);

/** Everything on the Insights screen is computed from the jobs already matched to the user's profile. */
export function computeInsights(jobs: ScoredJob[], profile: Profile): Insights {
  const total = jobs.length;
  const near = jobs.filter((j) => j.score >= 30);

  // Skills worth learning: what relevant jobs ask for that the CV doesn't show
  const gap = new Map<string, { jobs: number; unlocks: number }>();
  for (const j of near) {
    for (const s of j.missing) {
      const g = gap.get(s) ?? { jobs: 0, unlocks: 0 };
      g.jobs++;
      if (j.missing.length === 1) g.unlocks++;
      gap.set(s, g);
    }
  }
  const skillGaps = [...gap.entries()]
    .map(([skill, g]) => ({ skill, ...g }))
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, 10);

  // How in-demand the user's own skills are
  const demand = new Map<string, number>();
  for (const j of jobs) for (const s of j.matched) demand.set(s, (demand.get(s) ?? 0) + 1);
  const skillDemand = top(demand, 8);

  // Salary (USD listings only, so we never mix currencies)
  const usd = jobs.filter((j) => j.salary?.startsWith("$") && j.salaryMax && j.salaryMax >= 10000 && j.salaryMax < 2_000_000).map((j) => j.salaryMax as number).sort((a, b) => a - b);
  let salary: Insights["salary"] = null;
  if (usd.length >= 5) {
    const min = usd[0];
    const max = usd[usd.length - 1];
    const bins = 6;
    const step = (max - min) / bins || 1;
    const counts = Array.from({ length: bins }, () => 0);
    for (const v of usd) counts[Math.min(bins - 1, Math.floor((v - min) / step))]++;
    salary = {
      n: usd.length,
      min,
      median: usd[Math.floor(usd.length / 2)],
      max,
      buckets: counts.map((value, i) => ({ label: fmt(min + step * i), value, sub: `${fmt(min + step * i)} – ${fmt(min + step * (i + 1))}` })),
    };
  }

  // Companies hiring the most roles that fit
  const co = new Map<string, { jobs: number; logo?: string }>();
  for (const j of jobs) {
    const c = co.get(j.company) ?? { jobs: 0, logo: j.logo };
    c.jobs++;
    co.set(j.company, c);
  }
  const companies = [...co.entries()].map(([name, c]) => ({ name, ...c })).sort((a, b) => b.jobs - a.jobs).slice(0, 8);

  // Where the jobs are
  const loc = new Map<string, number>();
  for (const j of jobs) {
    const name = j.geo.countries[0] ? countryName(j.geo.countries[0]) : j.geo.regions[0] ? j.geo.regions[0].replace(/^./, (c) => c.toUpperCase()) : "Worldwide";
    loc.set(name, (loc.get(name) ?? 0) + 1);
  }

  // Freshness
  const now = Date.now();
  const buckets = { today: 0, week: 0, month: 0, older: 0, unknown: 0 };
  for (const j of jobs) {
    if (!j.postedAt) buckets.unknown++;
    else {
      const d = (now - +new Date(j.postedAt)) / 864e5;
      if (d < 1) buckets.today++;
      else if (d < 7) buckets.week++;
      else if (d < 30) buckets.month++;
      else buckets.older++;
    }
  }
  const recency: Bar[] = [
    { label: "Today", value: buckets.today },
    { label: "This week", value: buckets.week },
    { label: "This month", value: buckets.month },
    { label: "Older", value: buckets.older },
  ];

  const roles = new Map<string, number>();
  for (const j of jobs) for (const [name, re] of ROLES) if (re.test(j.title)) roles.set(name, (roles.get(name) ?? 0) + 1);

  const sources = new Map<string, number>();
  for (const j of jobs) sources.set(j.source, (sources.get(j.source) ?? 0) + 1);

  void profile;
  return {
    total,
    strong: jobs.filter((j) => j.score >= 65).length,
    remote: jobs.filter((j) => j.remote).length,
    withSalary: jobs.filter((j) => j.salary).length,
    postedWeek: buckets.today + buckets.week,
    skillGaps,
    skillDemand,
    salary,
    companies,
    locations: top(loc, 6),
    recency,
    roles: top(roles, 6),
    sources: top(sources, 8),
  };
}
