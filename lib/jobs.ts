import { levelFromTitle } from "./profile";
import { findSkills } from "./skills";
import type { Job } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Source credits. Remote OK and Jobicy require a visible link back to them.
export const SOURCES: Record<string, string> = {
  Remotive: "https://remotive.com",
  "Remote OK": "https://remoteok.com",
  Jobicy: "https://jobicy.com",
  Arbeitnow: "https://www.arbeitnow.com",
};

const TTL = 60 * 60 * 1000; // feeds are cached for an hour so we stay well inside provider rate limits
const cache = new Map<string, { at: number; data: Promise<Job[]> }>();

function cached(key: string, load: () => Promise<Job[]>): Promise<Job[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const data = load().catch(() => {
    cache.delete(key); // don't cache failures
    return [] as Job[];
  });
  cache.set(key, { at: Date.now(), data });
  return data;
}

async function getJson(url: string): Promise<any> {
  const r = await fetch(url, {
    headers: { "User-Agent": "cv-tracker/0.1 (open-source job matcher)", Accept: "application/json" },
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
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

const fmtMoney = (n: number, cur = "$") => `${cur}${n >= 1000 ? Math.round(n / 1000) + "k" : n}`;
const CUR: Record<string, string> = { USD: "$", GBP: "£", EUR: "€", CAD: "CA$", AUD: "A$" };

function salaryRange(min?: number, max?: number, cur = "USD", period = "yearly") {
  if (!min && !max) return {};
  const sym = CUR[cur] ?? cur + " ";
  const label = [min && fmtMoney(min, sym), max && max !== min && fmtMoney(max, sym)].filter(Boolean).join(" – ");
  const mult = /month/i.test(period) ? 12 : /week/i.test(period) ? 52 : /hour/i.test(period) ? 2000 : 1;
  const per = mult === 1 ? "" : `/${period.replace(/ly$/, "").replace("hourl", "hour")}`;
  return { salary: label + per, salaryMax: (max ?? min ?? 0) * mult };
}

function finish(j: Omit<Job, "skills" | "level" | "description"> & { description: string }): Job {
  const description = j.description.slice(0, 4000);
  return {
    ...j,
    description,
    skills: findSkills(`${j.title} ${j.tags.join(" ")} ${description}`),
    level: levelFromTitle(j.title),
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
  return (d as any[]).slice(1).map((j) => {
    const s = salaryRange(j.salary_min || undefined, j.salary_max || undefined);
    return finish({
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
      ...s,
    });
  });
}

async function jobicy(tag: string): Promise<Job[]> {
  const d = await getJson(`https://jobicy.com/api/v2/remote-jobs?count=50${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`);
  return (d.jobs ?? []).map((j: any) => {
    const s = salaryRange(j.salaryMin, j.salaryMax, j.salaryCurrency, j.salaryPeriod);
    return finish({
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
      ...s,
    });
  });
}

async function arbeitnow(page: number): Promise<Job[]> {
  const d = await getJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
  return (d.data ?? []).map((j: any) =>
    finish({
      id: `arbeitnow-${j.slug}`,
      title: j.title,
      company: j.company_name,
      location: j.location || "Germany",
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

export async function fetchJobs(searchTerms: string[]): Promise<Job[]> {
  const terms = [...new Set(searchTerms.map((t) => t.toLowerCase().trim()).filter(Boolean))].slice(0, 3);
  const batches = await Promise.all([
    cached("remotive:", () => remotive("")),
    ...terms.map((t) => cached(`remotive:${t}`, () => remotive(t))),
    cached("remoteok", remoteOk),
    cached("jobicy:", () => jobicy("")),
    ...terms.slice(0, 2).map((t) => cached(`jobicy:${t}`, () => jobicy(t.split(" ")[0]))),
    cached("arbeitnow:1", () => arbeitnow(1)),
    cached("arbeitnow:2", () => arbeitnow(2)),
  ]);
  const seen = new Set<string>();
  const out: Job[] = [];
  for (const j of batches.flat()) {
    if (!j.title || !j.url || seen.has(j.id)) continue;
    seen.add(j.id);
    out.push(j);
  }
  return out;
}
