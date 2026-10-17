// A tiny client for any OpenAI-compatible chat API. Free options that work out of the box:
//   Google Gemini (free key), Groq (free key), OpenRouter (free models), Ollama (runs on your own computer).
// Several can be configured at once: if one is rate limited or down, the next one is tried.

export type Provider = { name: string; base: string; key?: string; model: string };

export class AiError extends Error {
  constructor(
    message: string,
    public code: "not_configured" | "rate_limited" | "provider_error" | "bad_output",
    public status: number,
  ) {
    super(message);
  }
}

const env = (k: string) => process.env[k]?.trim() || undefined;

export function providers(): Provider[] {
  const list: Provider[] = [];
  if (env("GEMINI_API_KEY"))
    list.push({ name: "Gemini", base: "https://generativelanguage.googleapis.com/v1beta/openai", key: env("GEMINI_API_KEY"), model: env("GEMINI_MODEL") ?? "gemini-3.5-flash-lite" });
  if (env("GROQ_API_KEY"))
    list.push({ name: "Groq", base: "https://api.groq.com/openai/v1", key: env("GROQ_API_KEY"), model: env("GROQ_MODEL") ?? "openai/gpt-oss-120b" });
  if (env("OPENROUTER_API_KEY"))
    list.push({ name: "OpenRouter", base: "https://openrouter.ai/api/v1", key: env("OPENROUTER_API_KEY"), model: env("OPENROUTER_MODEL") ?? "openrouter/free" });
  if (env("OLLAMA_MODEL"))
    list.push({ name: "Ollama", base: `${env("OLLAMA_HOST") ?? "http://localhost:11434"}/v1`, model: env("OLLAMA_MODEL")! });
  if (env("AI_BASE_URL") && env("AI_MODEL"))
    list.push({ name: "Custom", base: env("AI_BASE_URL")!.replace(/\/+$/, ""), key: env("AI_API_KEY"), model: env("AI_MODEL")! });
  return list;
}

export const aiStatus = () => {
  const p = providers();
  return { enabled: p.length > 0, providers: p.map((x) => x.name) };
};

// --- Per-visitor rate limit so a public deployment can't burn through a free quota ---
const hits = new Map<string, number[]>();
export function checkRate(ip: string) {
  const limit = Number(env("AI_RATE_LIMIT") ?? 40); // requests per hour per visitor
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= limit) throw new AiError("You've used a lot of AI requests this hour. Please try again later.", "rate_limited", 429);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.delete(hits.keys().next().value as string);
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

function parseJson(raw: string): unknown {
  let s = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(s);
  } catch {
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a >= 0 && b > a) return JSON.parse(s.slice(a, b + 1));
    throw new Error("not json");
  }
}

async function call(p: Provider, system: string, user: string, maxTokens: number, jsonMode: boolean) {
  const res = await fetch(`${p.base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(p.key ? { authorization: `Bearer ${p.key}` } : {}) },
    body: JSON.stringify({
      model: p.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false as const, status: res.status, text };
  }
  const json = await res.json();
  const content: unknown = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) return { ok: false as const, status: 502, text: "empty response" };
  return { ok: true as const, content };
}

/** Asks the configured AI for a JSON object. Tries each provider in turn. */
export async function askJson(system: string, user: string, maxTokens = 1500): Promise<{ data: Record<string, unknown>; provider: string }> {
  const list = providers();
  if (!list.length) throw new AiError("AI isn't set up yet. Add a free API key to enable it (see the README).", "not_configured", 503);

  let rateLimited = false;
  for (const p of list) {
    try {
      let r = await call(p, system, user, maxTokens, true);
      // Some models reject JSON mode; retry once without it (the prompt still asks for JSON).
      if (!r.ok && r.status === 400 && /response_format|json/i.test(r.text)) r = await call(p, system, user, maxTokens, false);
      if (!r.ok) {
        if (r.status === 429) rateLimited = true;
        console.warn(`[ai] ${p.name} -> ${r.status} ${r.text.slice(0, 160)}`);
        continue;
      }
      const data = parseJson(r.content);
      if (data && typeof data === "object" && !Array.isArray(data)) return { data: data as Record<string, unknown>, provider: p.name };
      console.warn(`[ai] ${p.name} returned non-object JSON`);
    } catch (e) {
      console.warn(`[ai] ${p.name} failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (rateLimited) throw new AiError("The free AI quota is busy right now. Try again in a minute.", "rate_limited", 429);
  throw new AiError("The AI service didn't respond properly. Try again in a moment.", "provider_error", 502);
}
