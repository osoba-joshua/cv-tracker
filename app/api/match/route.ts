import { cvToText } from "@/lib/cv";
import { buildProfile } from "@/lib/profile";
import { fetchJobs } from "@/lib/jobs";
import { scoreJobs } from "@/lib/match";
import { explainTop } from "@/lib/explain";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("cv");
    if (!(file instanceof File)) return Response.json({ error: "No CV uploaded" }, { status: 400 });
    if (file.size > 5_000_000) return Response.json({ error: "CV too large (max 5MB)" }, { status: 400 });

    const text = await cvToText(file);
    if (text.trim().length < 50) return Response.json({ error: "Couldn't read text from that CV" }, { status: 400 });

    const profile = buildProfile(text);
    const queries = [...profile.titles.slice(0, 2), ...profile.skills.slice(0, 2)];
    const jobs = await fetchJobs(queries.length ? queries : ["developer"]);
    const top = scoreJobs(jobs, profile).slice(0, 20);
    const explained = await explainTop(text, top.slice(0, 10));
    const results = [...explained, ...top.slice(10)].map((j) => ({ ...j, description: j.description.slice(0, 300) }));

    return Response.json({ profile, total: jobs.length, results });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status: 500 });
  }
}
