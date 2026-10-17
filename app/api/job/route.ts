import { findJob } from "@/lib/jobs";

// GET /api/job?id=... -> { description } : the full text of a job from the cached feeds.
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!id || id.length > 300) return Response.json({ error: "Missing id" }, { status: 400 });
  const job = await findJob(id);
  if (!job) return Response.json({ error: "Job not in cache" }, { status: 404 });
  return Response.json({ description: job.description });
}
