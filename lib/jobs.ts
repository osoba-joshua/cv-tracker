export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  tags: string[];
  source: string;
  postedAt?: string;
};

const strip = (h: string) =>
  h.replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

/* eslint-disable @typescript-eslint/no-explicit-any */
async function remotive(query: string): Promise<Job[]> {
  const r = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=50`);
  if (!r.ok) return [];
  const d = await r.json();
  return (d.jobs ?? []).map((j: any) => ({
    id: `remotive-${j.id}`,
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || "Remote",
    url: j.url,
    description: strip(j.description ?? "").slice(0, 3000),
    tags: j.tags ?? [],
    source: "Remotive",
    postedAt: j.publication_date,
  }));
}

async function arbeitnow(): Promise<Job[]> {
  const r = await fetch("https://www.arbeitnow.com/api/job-board-api");
  if (!r.ok) return [];
  const d = await r.json();
  return (d.data ?? []).map((j: any) => ({
    id: `arbeitnow-${j.slug}`,
    title: j.title,
    company: j.company_name,
    location: j.remote ? `Remote${j.location ? " / " + j.location : ""}` : j.location,
    url: j.url,
    description: strip(j.description ?? "").slice(0, 3000),
    tags: j.tags ?? [],
    source: "Arbeitnow",
    postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : undefined,
  }));
}

export async function fetchJobs(queries: string[]): Promise<Job[]> {
  const qs = queries.slice(0, 3);
  const results = await Promise.allSettled([...qs.map(remotive), arbeitnow()]);
  const seen = new Set<string>();
  const out: Job[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const j of r.value) {
      if (!seen.has(j.id)) {
        seen.add(j.id);
        out.push(j);
      }
    }
  }
  return out;
}
