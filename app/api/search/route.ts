import { countryByCode } from "@/lib/geo";
import { fetchJobs, localSourcesConfigured } from "@/lib/jobs";
import { rank } from "@/lib/match";
import { normText } from "@/lib/text";
import { haystack, isEmptyQuery, matches, parseQuery, queryText } from "@/lib/search";
import type { Level, Profile, SearchResponse, UserLocation } from "@/lib/types";

export const maxDuration = 60;

const EXCERPT = 300; // the list only needs a short excerpt; the full text loads when a job is opened

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const strs = (v: unknown, n: number, max: number) =>
  Array.isArray(v) ? v.map((x) => str(x, max).trim()).filter(Boolean).slice(0, n) : [];

// POST JSON {skills, titles, years, level, location: {country, city}, query?} -> ranked jobs
// `query` searches the job boards for any term (not only what's on the CV).
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
    const query = parseQuery(str(body.query, 80));
    const hasQuery = !isEmptyQuery(query);
    if (!hasQuery && !profile.skills.length && !profile.titles.length) {
      return Response.json({ error: "Add at least one skill or role to search." }, { status: 400 });
    }
    const code = str(body.location?.country, 2).toUpperCase();
    const user: UserLocation = { country: countryByCode(code) ? code : "", city: str(body.location?.city, 60) };

    const terms = [
      ...(hasQuery ? [queryText(query)] : []),
      ...profile.titles.slice(0, 2),
      ...profile.skills.slice(0, 2).map((s) => s.toLowerCase()),
    ].filter(Boolean);
    let jobs = await fetchJobs(terms.length ? terms : ["developer"], user);
    const total = jobs.length;
    if (hasQuery) jobs = jobs.filter((j) => matches(haystack(j, true), query));

    let ranked = rank(jobs, profile, user, hasQuery);
    if (hasQuery) {
      // When someone searches for something specific, jobs with it in the title come first.
      const inTitle = (j: { title: string }) => (matches(normText(j.title), { ...query, exclude: [] }) ? 1 : 0);
      ranked = ranked.map((j) => ({ j, t: inTitle(j) })).sort((a, b) => b.t - a.t || b.j.score - a.j.score).map((x) => x.j);
    }
    const results = ranked.map((j) => ({ ...j, description: j.description.slice(0, EXCERPT) }));

    const sources: Record<string, number> = {};
    for (const j of jobs) sources[j.source] = (sources[j.source] ?? 0) + 1;

    const res: SearchResponse = { total, localSources: localSourcesConfigured(), results, sources };
    return Response.json(res);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status: 500 });
  }
}
