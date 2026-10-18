import { CoreError, coreJob } from "@/lib/core";

// GET /api/job?id=... -> { description } : the full text of a job from the cached feeds.
export async function GET(req: Request) {
  try {
    const description = await coreJob(new URL(req.url).searchParams.get("id") ?? "");
    if (description === null) return Response.json({ error: "Job not in cache" }, { status: 404 });
    return Response.json({ description });
  } catch (e) {
    if (e instanceof CoreError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
