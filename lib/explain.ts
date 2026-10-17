import Anthropic from "@anthropic-ai/sdk";
import type { Scored } from "./match";

// Optional: if ANTHROPIC_API_KEY is set, ask Claude for a one-line reason per top job.
export async function explainTop(cvText: string, jobs: Scored[]): Promise<Scored[]> {
  if (!process.env.ANTHROPIC_API_KEY || jobs.length === 0) return jobs;
  try {
    const client = new Anthropic();
    const list = jobs.map((j, i) => `${i}. ${j.title} at ${j.company}: ${j.description.slice(0, 400)}`).join("\n");
    const msg = await client.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `CV:\n${cvText.slice(0, 4000)}\n\nJobs:\n${list}\n\nFor each job give a one-sentence reason it does or doesn't fit this CV. Reply only as JSON: [{"i":0,"why":"..."}]`,
        },
      ],
    });
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const arr = JSON.parse(text.slice(text.indexOf("["), text.lastIndexOf("]") + 1)) as { i: number; why: string }[];
    return jobs.map((j, i) => ({ ...j, why: arr.find((a) => a.i === i)?.why }));
  } catch {
    return jobs;
  }
}
