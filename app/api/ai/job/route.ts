import { AiError, checkRate, clientIp } from "@/lib/ai";
import { aiJobTask, type JobInput, type Task, type Tone } from "@/lib/prompts";

export const maxDuration = 60;

const TASKS: Task[] = ["fit", "cover", "prep", "tweak"];
const TONES: Tone[] = ["professional", "friendly", "concise"];
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const strs = (v: unknown) => (Array.isArray(v) ? v.map((x) => str(x, 40)).filter(Boolean).slice(0, 12) : []);

// POST {task, cv, job, tone?} -> { result, provider }
export async function POST(req: Request) {
  try {
    checkRate(clientIp(req));
    const body = await req.json();
    const task = body.task as Task;
    if (!TASKS.includes(task)) return Response.json({ error: "Unknown task" }, { status: 400 });
    const cv = str(body.cv, 12000);
    if (cv.trim().length < 30) return Response.json({ error: "Upload your CV first so the AI can use it.", code: "no_cv" }, { status: 400 });
    const j = body.job ?? {};
    const job: JobInput = {
      title: str(j.title, 200),
      company: str(j.company, 120),
      location: str(j.location, 120),
      description: str(j.description, 5000),
      matched: strs(j.matched),
      missing: strs(j.missing),
    };
    if (!job.title) return Response.json({ error: "Missing job" }, { status: 400 });
    const tone = TONES.includes(body.tone) ? (body.tone as Tone) : "professional";
    return Response.json(await aiJobTask(task, cv, job, tone));
  } catch (e) {
    if (e instanceof AiError) return Response.json({ error: e.message, code: e.code }, { status: e.status });
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
