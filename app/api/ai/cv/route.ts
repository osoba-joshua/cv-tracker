import { AiError, checkRate, clientIp } from "@/lib/ai";
import { aiCvReview } from "@/lib/prompts";

export const maxDuration = 60;

// POST {cv, roles?} -> { result, provider } : an AI review of the CV itself.
export async function POST(req: Request) {
  try {
    checkRate(clientIp(req));
    const body = await req.json();
    const cv = typeof body.cv === "string" ? body.cv : "";
    if (cv.trim().length < 80) return Response.json({ error: "Upload your CV first so the AI can review it.", code: "no_cv" }, { status: 400 });
    const roles = Array.isArray(body.roles) ? body.roles.filter((r: unknown) => typeof r === "string").slice(0, 5).map((r: string) => r.slice(0, 60)) : [];
    return Response.json(await aiCvReview(cv, roles));
  } catch (e) {
    if (e instanceof AiError) return Response.json({ error: e.message, code: e.code }, { status: e.status });
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
