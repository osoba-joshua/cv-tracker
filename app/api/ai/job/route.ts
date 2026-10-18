import { AiError, checkRate, clientIp } from "@/lib/ai";
import { CoreError, coreAiJob } from "@/lib/core";

export const maxDuration = 60;

// POST {task, cv, job, tone?} -> { result, provider }
export async function POST(req: Request) {
  try {
    checkRate(clientIp(req));
    return Response.json(await coreAiJob(await req.json()));
  } catch (e) {
    if (e instanceof AiError) return Response.json({ error: e.message, code: e.code }, { status: e.status });
    if (e instanceof CoreError) return Response.json({ error: e.message, code: e.code }, { status: e.status });
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
