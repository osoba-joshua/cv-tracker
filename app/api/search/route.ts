import { CoreError, coreSearch } from "@/lib/core";

export const maxDuration = 60;

// POST JSON {skills, titles, years, level, location: {country, city}, query?} -> ranked jobs
// `query` searches the job boards for any term (not only what's on the CV).
export async function POST(req: Request) {
  try {
    return Response.json(await coreSearch(await req.json()));
  } catch (e) {
    if (e instanceof CoreError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status: 500 });
  }
}
