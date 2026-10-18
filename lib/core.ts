// The app's logic with no dependency on HTTP. The API routes call these on a server; the on-device engine
// (static web build and the Android/iOS apps) calls them directly in the browser.
import type { AiKeys } from "./ai";
import { countryByCode, COUNTRIES } from "./geo";
import { fetchJobs, findJob, localSourcesConfigured } from "./jobs";
import { rank } from "./match";
import { buildProfile } from "./profile";
import { haystack, isEmptyQuery, matches, parseQuery, queryText } from "./search";
import { aiCvReview, aiJobTask, aiProfile, type JobInput, type Task, type Tone } from "./prompts";
import { normText } from "./text";
import type { Level, Profile, SearchResponse, UserLocation } from "./types";

export class CoreError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code?: string,
  ) {
    super(message);
  }
}

const EXCERPT = 300; // the list only needs a short excerpt; the full text loads when a job is opened

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const strs = (v: unknown, n: number, max: number) =>
  Array.isArray(v) ? v.map((x) => str(x, max).trim()).filter(Boolean).slice(0, n) : [];

/** Turns CV text into a profile. */
export function coreParse(rawText: string) {
  const text = rawText.slice(0, 60_000);
  if (text.trim().length < 30) {
    throw new CoreError("Couldn't read any text from that CV. Try a text-based PDF or paste it in.");
  }
  return { profile: buildProfile(text), text };
}

/** Ranks live jobs for a profile + location, optionally narrowed by a board search. */
export async function coreSearch(body: Record<string, unknown>): Promise<SearchResponse> {
  const level = [0, 1, 2, 3, 4].includes(body.level as number) ? (body.level as Level) : null;
  const profile: Profile = {
    skills: strs(body.skills, 60, 40),
    titles: strs(body.titles, 8, 60).map((t) => t.toLowerCase()),
    years: typeof body.years === "number" ? body.years : null,
    level,
  };
  const query = parseQuery(str(body.query, 80));
  const hasQuery = !isEmptyQuery(query);
  if (!hasQuery && !profile.skills.length && !profile.titles.length) {
    throw new CoreError("Add at least one skill or role to search.");
  }
  const loc = (body.location ?? {}) as { country?: unknown; city?: unknown };
  const code = str(loc.country, 2).toUpperCase();
  const user: UserLocation = { country: countryByCode(code) ? code : "", city: str(loc.city, 60) };

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
  return { total, localSources: localSourcesConfigured(), results, sources };
}

/** The full text of a job from the cached feeds, or null if it has expired from the cache. */
export async function coreJob(id: string): Promise<string | null> {
  if (!id || id.length > 300) throw new CoreError("Missing id");
  return (await findJob(id))?.description ?? null;
}

/** Live numbers for the landing page. */
export async function coreStats() {
  try {
    const jobs = await fetchJobs(["developer"], { country: "", city: "" });
    return { jobs: jobs.length, sources: new Set(jobs.map((j) => j.source)).size, countries: COUNTRIES.length };
  } catch {
    return { jobs: 0, sources: 0, countries: COUNTRIES.length };
  }
}

// ---- AI requests (validated the same way wherever they run) ----

const TASKS: Task[] = ["fit", "cover", "prep", "tweak"];
const TONES: Tone[] = ["professional", "friendly", "concise"];
const short = (v: unknown) => (Array.isArray(v) ? v.map((x) => str(x, 40)).filter(Boolean).slice(0, 12) : []);

export async function coreAiProfile(text: unknown, keys?: AiKeys) {
  const t = typeof text === "string" ? text : "";
  if (t.trim().length < 30) throw new CoreError("No CV text provided.");
  return aiProfile(t, keys);
}

export async function coreAiJob(body: Record<string, unknown>, keys?: AiKeys) {
  const task = body.task as Task;
  if (!TASKS.includes(task)) throw new CoreError("Unknown task");
  const cv = str(body.cv, 12000);
  if (cv.trim().length < 30) throw new CoreError("Upload your CV first so the AI can use it.", 400, "no_cv");
  const j = (body.job ?? {}) as Record<string, unknown>;
  const job: JobInput = {
    title: str(j.title, 200),
    company: str(j.company, 120),
    location: str(j.location, 120),
    description: str(j.description, 5000),
    matched: short(j.matched),
    missing: short(j.missing),
  };
  if (!job.title) throw new CoreError("Missing job");
  const tone = TONES.includes(body.tone as Tone) ? (body.tone as Tone) : "professional";
  return aiJobTask(task, cv, job, tone, keys);
}

export async function coreAiCv(body: Record<string, unknown>, keys?: AiKeys) {
  const cv = typeof body.cv === "string" ? body.cv : "";
  if (cv.trim().length < 80) throw new CoreError("Upload your CV first so the AI can review it.", 400, "no_cv");
  const roles = Array.isArray(body.roles) ? body.roles.filter((r): r is string => typeof r === "string").slice(0, 5).map((r) => r.slice(0, 60)) : [];
  return aiCvReview(cv, roles, keys);
}
