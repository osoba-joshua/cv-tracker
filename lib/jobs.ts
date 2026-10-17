import { countryByCode, parseGeo } from "./geo";
import { levelFromTitle } from "./profile";
import { findSkills } from "./skills";
import type { Job, Level, UserLocation } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Source credits. Remote OK, Jobicy and Himalayas require a visible link back to them.
export const SOURCES: Record<string, string> = {
  Remotive: "https://remotive.com",
  "Remote OK": "https://remoteok.com",
  Jobicy: "https://jobicy.com",
  Himalayas: "https://himalayas.app",
  "Working Nomads": "https://www.workingnomads.com",
  Arbeitnow: "https://www.arbeitnow.com",
  Adzuna: "https://www.adzuna.com",
  Jooble: "https://jooble.org",
};

const TTL = 60 * 60 * 1000; // feeds are cached for an hour so we stay inside provider rate limits
const FAIL_TTL = 5 * 60 * 1000; // failures are remembered briefly so a broken source isn't hammered
const MAX_ENTRIES = 300;
type Entry = { at: number; ttl: number; data: Promise<Job[]> };
const cache = new Map<string, Entry>();

function cached(key: string, load: () => Promise<Job[]>): Promise<Job[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.data;
  const entry = { at: Date.now(), ttl: TTL } as Entry;
  entry.data = load().catch((e) => {
    entry.ttl = FAIL_TTL;
    console.warn(`[jobs] ${key} failed: ${e instanceof Error ? e.message : e}`);
    return [] as Job[];
  });
  cache.set(key, entry);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
  return entry.data;
}

const UA = "cv-tracker/0.2 (open-source job matcher)";

async function getJson(url: string, init?: RequestInit): Promise<any> {
  const r = await fetch(url, {
    ...init,
    headers: { "User-Agent": UA, Accept: "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error(`${new URL(url).host} -> ${r.status}`);
  return r.json();
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", rsquo: "'", lsquo: "'", ndash: "–", mdash: "—" };

function toText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/h[1-6]|\/li|\/ul|\/ol)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&([a-z]+);/gi, (m, e) => ENTITIES[e.toLowerCase()] ?? " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const fmtMoney = (n: number, cur = "$") =>
  n >= 1e6 ? `${cur}${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : `${cur}${n >= 1000 ? Math.round(n / 1000) + "k" : n}`;
const CUR: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", CAD: "CA$", AUD: "A$", INR: "₹", NGN: "₦", ZAR: "R", BRL: "R$", PLN: "zł", SGD: "S$", NZD: "NZ$", MXN: "MX$" };

function salaryRange(min?: number | null, max?: number | null, cur = "USD", period = "yearly") {
  if (!min && !max) return {};
  const sym = CUR[cur] ?? cur + " ";
  const label = [min && fmtMoney(min, sym), max && max !== min && fmtMoney(max, sym)].filter(Boolean).join(" – ");
  const mult = /month/i.test(period) ? 12 : /week/i.test(period) ? 52 : /hour/i.test(period) ? 2000 : 1;
  const per = mult === 1 ? "" : `/${period.replace(/ly$/, "").replace("hourl", "hour")}`;
  return { salary: label + per, salaryMax: (max ?? min ?? 0) * mult };
}

type Raw = Omit<Job, "skills" | "level" | "geo" | "description"> & { description: string; level?: Level; geoText?: string };

function finish({ geoText, level, ...j }: Raw): Job {
  const description = j.description.slice(0, 4000);
  return {
    ...j,
    description,
    skills: findSkills(`${j.title} ${j.tags.join(" ")} ${description}`),
    level: level ?? levelFromTitle(j.title),
    geo: parseGeo(geoText ?? j.location),
  };
}

async function remotive(query: string): Promise<Job[]> {
  const d = await getJson(`https://remotive.com/api/remote-jobs?limit=100${query ? `&search=${encodeURIComponent(query)}` : ""}`);
  return (d.jobs ?? []).map((j: any) => {
    const m = /\$?(\d+)k?\s*-\s*\$?(\d+)k/i.exec(j.salary ?? "");
    return finish({
      id: `remotive-${j.id}`,
      title: j.title,
      company: j.company_name,
      logo: j.company_logo || undefined,
      location: j.candidate_required_location || "Worldwide",
      remote: true,
      url: j.url,
      source: "Remotive",
      sourceUrl: SOURCES.Remotive,
      description: toText(j.description ?? ""),
      tags: j.tags ?? [],
      jobType: j.job_type ? String(j.job_type).replace("_", " ") : undefined,
      salary: j.salary || undefined,
      salaryMax: m ? +m[2] * 1000 : undefined,
      postedAt: j.publication_date ? new Date(j.publication_date + "Z").toISOString() : undefined,
    });
  });
}

async function remoteOk(): Promise<Job[]> {
  const d = await getJson("https://remoteok.com/api");
  return (d as any[]).slice(1).map((j) =>
    finish({
      id: `remoteok-${j.id}`,
      title: j.position,
      company: j.company,
      logo: j.company_logo || j.logo || undefined,
      location: j.location || "Worldwide",
      remote: true,
      url: j.url || j.apply_url,
      source: "Remote OK",
      sourceUrl: SOURCES["Remote OK"],
      description: toText(j.description ?? ""),
      tags: j.tags ?? [],
      postedAt: j.date,
      ...salaryRange(j.salary_min || undefined, j.salary_max || undefined),
    }),
  );
}

async function jobicy(geoSlug: string, tag: string): Promise<Job[]> {
  const q = [geoSlug && `geo=${geoSlug}`, tag && `tag=${encodeURIComponent(tag)}`].filter(Boolean).join("&");
  const d = await getJson(`https://jobicy.com/api/v2/remote-jobs?count=50${q ? "&" + q : ""}`);
  if (d.success === false) throw new Error(String(d.error ?? "jobicy error"));
  return (d.jobs ?? []).map((j: any) =>
    finish({
      id: `jobicy-${j.id}`,
      title: toText(j.jobTitle ?? ""),
      company: j.companyName,
      logo: j.companyLogo || undefined,
      location: j.jobGeo || "Anywhere",
      remote: true,
      url: j.url,
      source: "Jobicy",
      sourceUrl: SOURCES.Jobicy,
      description: toText(j.jobDescription ?? ""),
      tags: [...(j.jobIndustry ?? []), ...(j.jobType ?? [])].map((t: string) => toText(t)),
      jobType: j.jobType?.[0],
      postedAt: j.pubDate ? new Date(j.pubDate).toISOString() : undefined,
      ...salaryRange(j.salaryMin, j.salaryMax, j.salaryCurrency, j.salaryPeriod),
    }),
  );
}

const HIM_LEVEL: Record<string, Level> = { "Entry-level": 1, "Mid-level": 2, Senior: 3, Manager: 4, Director: 4, Executive: 4 };

async function himalayas(q: string, country: string, page: number): Promise<Job[]> {
  const params = new URLSearchParams({ sort: "recent", page: String(page) });
  if (q) params.set("q", q);
  if (country) params.set("country", country);
  const d = await getJson(`https://himalayas.app/jobs/api/search?${params}`);
  return (d.jobs ?? []).map((j: any) => {
    const restrictions: string[] = j.locationRestrictions ?? [];
    const location = restrictions.length ? restrictions.join(", ") : "Worldwide";
    return finish({
      id: `himalayas-${j.guid ?? j.applicationLink}`,
      title: j.title,
      company: j.companyName,
      logo: j.companyLogo || undefined,
      location,
      remote: true,
      url: j.applicationLink || j.guid,
      source: "Himalayas",
      sourceUrl: SOURCES.Himalayas,
      description: toText(j.description ?? j.excerpt ?? ""),
      tags: [...(j.categories ?? []), ...(j.parentCategories ?? [])].map((t: string) => t.replace(/-/g, " ")),
      jobType: j.employmentType,
      postedAt: j.pubDate ? new Date(j.pubDate * 1000).toISOString() : undefined,
      level: HIM_LEVEL[j.seniority?.[0]],
      ...salaryRange(j.minSalary, j.maxSalary, j.currency ?? "USD", j.salaryPeriod ?? "yearly"),
    });
  });
}

async function workingNomads(): Promise<Job[]> {
  const d = await getJson("https://www.workingnomads.com/api/exposed_jobs/");
  return (d as any[]).map((j) =>
    finish({
      id: `workingnomads-${/\/(\d+)\/?$/.exec(j.url)?.[1] ?? j.url}`,
      title: j.title,
      company: j.company_name,
      location: j.location || "Worldwide",
      remote: true,
      url: j.url,
      source: "Working Nomads",
      sourceUrl: SOURCES["Working Nomads"],
      description: toText(j.description ?? ""),
      tags: [j.category_name, ...String(j.tags ?? "").split(",")].filter(Boolean).map((t: string) => t.trim()),
      postedAt: j.pub_date ? new Date(j.pub_date).toISOString() : undefined,
    }),
  );
}

async function arbeitnow(page: number): Promise<Job[]> {
  const d = await getJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
  return (d.data ?? []).map((j: any) =>
    finish({
      id: `arbeitnow-${j.slug}`,
      title: j.title,
      company: j.company_name,
      location: j.location ? (/germany|deutschland/i.test(j.location) ? j.location : `${j.location}, Germany`) : "Germany",
      remote: !!j.remote,
      url: j.url,
      source: "Arbeitnow",
      sourceUrl: SOURCES.Arbeitnow,
      description: toText(j.description ?? ""),
      tags: j.tags ?? [],
      jobType: j.job_types?.[0],
      postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : undefined,
    }),
  );
}

// --- Optional sources: free API keys, they add local on-site jobs in many countries ---

const ADZUNA_COUNTRIES = new Set(["at", "au", "be", "br", "ca", "ch", "de", "es", "fr", "gb", "in", "it", "mx", "nl", "nz", "pl", "sg", "us", "za"]);
const ADZUNA_CUR: Record<string, string> = { gb: "GBP", us: "USD", au: "AUD", ca: "CAD", in: "INR", za: "ZAR", br: "BRL", pl: "PLN", sg: "SGD", nz: "NZD", mx: "MXN" };

async function adzuna(cc: string, what: string, where: string): Promise<Job[]> {
  const id = process.env.ADZUNA_APP_ID;
  const key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return [];
  const p = new URLSearchParams({ app_id: id, app_key: key, results_per_page: "50", "content-type": "application/json" });
  if (what) p.set("what", what);
  if (where) p.set("where", where);
  const d = await getJson(`https://api.adzuna.com/v1/api/jobs/${cc}/search/1?${p}`);
  return (d.results ?? []).map((j: any) =>
    finish({
      id: `adzuna-${j.id}`,
      title: toText(j.title ?? ""),
      company: j.company?.display_name ?? "Unknown",
      location: j.location?.display_name ?? "",
      remote: /\bremote\b/i.test(`${j.title} ${j.description}`),
      url: j.redirect_url,
      source: "Adzuna",
      sourceUrl: SOURCES.Adzuna,
      description: toText(j.description ?? ""),
      tags: j.category?.label ? [j.category.label] : [],
      jobType: j.contract_time ? String(j.contract_time).replace("_", " ") : undefined,
      postedAt: j.created,
      ...salaryRange(j.salary_min, j.salary_max, ADZUNA_CUR[cc] ?? "USD"),
      geoText: `${j.location?.display_name ?? ""}, ${(j.location?.area ?? []).join(", ")}`,
    }),
  );
}

async function jooble(keywords: string, location: string): Promise<Job[]> {
  const key = process.env.JOOBLE_KEY;
  if (!key) return [];
  const d = await getJson(`https://jooble.org/api/${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ keywords, location, page: 1 }),
  });
  return (d.jobs ?? []).map((j: any) =>
    finish({
      id: `jooble-${j.id ?? j.link}`,
      title: toText(j.title ?? ""),
      company: j.company || "Unknown",
      location: j.location || location,
      remote: /\bremote\b/i.test(`${j.title} ${j.location} ${j.snippet}`),
      url: j.link,
      source: "Jooble",
      sourceUrl: SOURCES.Jooble,
      description: toText(j.snippet ?? ""),
      tags: [],
      jobType: j.type || undefined,
      salary: j.salary || undefined,
      postedAt: j.updated ? new Date(j.updated).toISOString() : undefined,
    }),
  );
}

/** Finds a job by id in the cached feeds (used to load the full description on demand). */
export async function findJob(id: string): Promise<Job | undefined> {
  const prefix = id.split("-")[0];
  for (const [key, entry] of cache) {
    if (!key.toLowerCase().startsWith(prefix.slice(0, 5))) continue;
    const hit = (await entry.data).find((x) => x.id === id);
    if (hit) return hit;
  }
  for (const entry of cache.values()) {
    const hit = (await entry.data).find((x) => x.id === id);
    if (hit) return hit;
  }
}

/** Which optional local-job providers are configured (shown in the UI so people know how to get more local jobs). */
export const localSourcesConfigured = () => ({
  adzuna: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
  jooble: !!process.env.JOOBLE_KEY,
});

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** The same job is often posted on several boards. Keep the richest copy. */
function dedupe(jobs: Job[]): Job[] {
  const best = new Map<string, Job>();
  for (const j of jobs) {
    if (!j.title || !j.url) continue;
    const k = `${norm(j.title)}|${norm(j.company)}`;
    const cur = best.get(k);
    const score = (x: Job) => (x.salary ? 1000 : 0) + x.description.length;
    if (!cur || score(j) > score(cur)) best.set(k, j);
  }
  return [...best.values()];
}

export async function fetchJobs(searchTerms: string[], user: UserLocation): Promise<Job[]> {
  const terms = [...new Set(searchTerms.map((t) => t.toLowerCase().trim()).filter(Boolean))].slice(0, 3);
  const country = countryByCode(user.country);
  const cc = user.country.toLowerCase();
  const slug = country?.name.toLowerCase().replace(/\s+/g, "-") ?? "";
  const city = user.city.trim();

  const jobs = await Promise.all([
    // Remote boards (worldwide)
    cached("remotive:", () => remotive("")),
    ...terms.map((t) => cached(`remotive:${t}`, () => remotive(t))),
    cached("remoteok", remoteOk),
    cached("workingnomads", workingNomads),
    cached("jobicy:", () => jobicy("", "")),
    ...terms.slice(0, 2).map((t) => cached(`jobicy:${t}`, () => jobicy("", t.split(" ")[0]))),
    cached("arbeitnow:1", () => arbeitnow(1)),
    cached("arbeitnow:2", () => arbeitnow(2)),
    // Himalayas can filter to jobs open to your country
    cached(`himalayas:${cc}::1`, () => himalayas("", cc, 1)),
    cached(`himalayas:${cc}::2`, () => himalayas("", cc, 2)),
    ...terms.slice(0, 2).map((t) => cached(`himalayas:${cc}:${t}:1`, () => himalayas(t, cc, 1))),
    // Location-aware extras
    ...(slug ? [cached(`jobicy-geo:${slug}`, () => jobicy(slug, ""))] : []),
    ...(ADZUNA_COUNTRIES.has(cc)
      ? terms.slice(0, 2).map((t) => cached(`adzuna:${cc}:${t}:${city}`, () => adzuna(cc, t, city)))
      : []),
    ...(country ? terms.slice(0, 2).map((t) => cached(`jooble:${cc}:${t}:${city}`, () => jooble(t, city || country.name))) : []),
  ]);
  return dedupe(jobs.flat());
}
