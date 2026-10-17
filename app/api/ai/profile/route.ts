import { AiError, checkRate, clientIp } from "@/lib/ai";
import { aiProfile } from "@/lib/prompts";

export const maxDuration = 60;

// POST {text} -> { profile, provider } : reads a CV with the configured free AI.
export async function POST(req: Request) {
  try {
    checkRate(clientIp(req));
    const body = await req.json();
    const text = typeof body.text === "string" ? body.text : "";
    if (text.trim().length < 30) return Response.json({ error: "No CV text provided." }, { status: 400 });
    return Response.json(await aiProfile(text));
  } catch (e) {
    if (e instanceof AiError) return Response.json({ error: e.message, code: e.code }, { status: e.status });
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
