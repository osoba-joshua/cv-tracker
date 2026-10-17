import { cvToText } from "@/lib/cv";
import { buildProfile } from "@/lib/profile";

// POST multipart (field "cv") or JSON {"text": "..."} -> { profile }
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
    text = text.slice(0, 60_000);
    if (text.trim().length < 30) {
      return Response.json({ error: "Couldn't read any text from that CV. Try a text-based PDF or paste it in." }, { status: 400 });
    }
    return Response.json({ profile: buildProfile(text) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Something went wrong" }, { status: 500 });
  }
}
