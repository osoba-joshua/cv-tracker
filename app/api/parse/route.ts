import { cvToText } from "@/lib/cv";
import { CoreError, coreParse } from "@/lib/core";

// POST multipart (field "cv") or JSON {"text": "..."} -> { profile, text }
export async function POST(req: Request) {
  try {
    let text = "";
    if ((req.headers.get("content-type") ?? "").includes("application/json")) {
      const body = await req.json();
      text = typeof body.text === "string" ? body.text : "";
    } else {
      const file = (await req.formData()).get("cv");
      if (!(file instanceof File)) return Response.json({ error: "No CV uploaded" }, { status: 400 });
      if (file.size > 5_000_000) return Response.json({ error: "CV too large (max 5MB)" }, { status: 400 });
      text = await cvToText(file);
    }
    return Response.json(coreParse(text));
  } catch (e) {
    if (e instanceof CoreError) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status: 500 });
  }
}
