import { fetchJobs } from "@/lib/jobs";
import { rank } from "@/lib/match";
import type { Level, Profile, SearchResponse } from "@/lib/types";

export const maxDuration = 60;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const strs = (v: unknown, n: number, max: number) =>
  Array.isArray(v) ? v.map((x) => str(x, max).trim()).filter(Boolean).slice(0, n) : [];

// POST JSON profile {skills, titles, years, level} -> ranked jobs
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const level = [0, 1, 2, 3, 4].includes(body.level) ? (body.level as Level) : null;
    const profile: Profile = {
      skills: strs(body.skills, 60, 40),
      titles: strs(body.titles, 8, 60).map((t) => t.toLowerCase()),
      years: typeof body.years === "number" ? body.years : null,
      level,
    };
    if (!profile.skills.length && !profile.titles.length) {
      return Response.json({ error: "Add at least one skill or role to search." }, { status: 400 });
    }

    const terms = [...profile.titles.slice(0, 2), ...profile.skills.slice(0, 2).map((s) => s.toLowerCase())];
    const jobs = await fetchJobs(terms.length ? terms : ["developer"]);
    const results = rank(jobs, profile);

    const sources: Record<string, number> = {};
    for (const j of jobs) sources[j.source] = (sources[j.source] ?? 0) + 1;

    const res: SearchResponse = { total: jobs.length, results, sources };
    return Response.json(res);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status: 500 });
  }
}
