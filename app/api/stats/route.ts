import { connection } from "next/server";
import { COUNTRIES } from "@/lib/geo";
import { fetchJobs } from "@/lib/jobs";

// GET -> live numbers for the landing page. Uses the same hourly feed cache as searches.
export async function GET() {
  await connection(); // never prerender: this needs live network access
  try {
    const jobs = await fetchJobs(["developer"], { country: "", city: "" });
    const sources = new Set(jobs.map((j) => j.source));
    return Response.json({ jobs: jobs.length, sources: sources.size, countries: COUNTRIES.length });
  } catch {
    return Response.json({ jobs: 0, sources: 0, countries: COUNTRIES.length });
  }
}
