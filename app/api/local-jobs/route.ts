import { checkRate, clientIp } from "@/lib/ai";
import { fetchLocalJobs } from "@/lib/jobs";

export const maxDuration = 30;

// POST {terms, country, city} -> { jobs } from the keyed local-job providers (Jooble, Adzuna) only.
// Used by the static site and phone apps, which can't hold those keys themselves.
export async function POST(req: Request) {
  try {
    checkRate(`jobs:${clientIp(req)}`, 120);
    const b = (await req.json()) as { terms?: unknown; country?: unknown; city?: unknown };
    const terms = Array.isArray(b.terms) ? b.terms.filter((t): t is string => typeof t === "string").slice(0, 3).map((t) => t.slice(0, 80)) : [];
    const country = typeof b.country === "string" ? b.country.slice(0, 2).toUpperCase() : "";
    const city = typeof b.city === "string" ? b.city.slice(0, 60) : "";
    return Response.json({ jobs: await fetchLocalJobs(terms, { country, city }) });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    return Response.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status });
  }
}
