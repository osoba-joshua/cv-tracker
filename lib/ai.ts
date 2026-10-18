import { httpRequest } from "./http";

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

// process.env is only read on a server; in the browser (on-device engine) it may not exist at all.
const env = (k: string) => {
  try {
    return process.env[k]?.trim() || undefined;
  } catch {
    return undefined;
  }
};

/** Keys a person pastes into Settings when the app runs on their device (no server to hold a .env). */
export type AiKeys = { gemini?: string; groq?: string; openrouter?: string; ollamaModel?: string; ollamaHost?: string };

const clean = (v?: string) => v?.trim() || undefined;

export function providers(keys?: AiKeys): Provider[] {
  // With explicit keys (on-device) use only those; otherwise read the server's environment.
  const get = (envName: string, own?: string) => (keys ? clean(own) : env(envName));
  const gemini = get("GEMINI_API_KEY", keys?.gemini);
  const groq = get("GROQ_API_KEY", keys?.groq);
  const openrouter = get("OPENROUTER_API_KEY", keys?.openrouter);
  const ollamaModel = get("OLLAMA_MODEL", keys?.ollamaModel);
  const ollamaHost = (keys ? clean(keys.ollamaHost) : env("OLLAMA_HOST")) ?? "http://localhost:11434";

  const list: Provider[] = [];
  if (gemini) list.push({ name: "Gemini", base: "https://generativelanguage.googleapis.com/v1beta/openai", key: gemini, model: env("GEMINI_MODEL") ?? "gemini-3.5-flash-lite" });
  if (groq) list.push({ name: "Groq", base: "https://api.groq.com/openai/v1", key: groq, model: env("GROQ_MODEL") ?? "openai/gpt-oss-120b" });
  if (openrouter) list.push({ name: "OpenRouter", base: "https://openrouter.ai/api/v1", key: openrouter, model: env("OPENROUTER_MODEL") ?? "openrouter/free" });
  if (ollamaModel) list.push({ name: "Ollama", base: `${ollamaHost.replace(/\/+$/, "")}/v1`, model: ollamaModel });
  if (!keys && env("AI_BASE_URL") && env("AI_MODEL"))
    list.push({ name: "Custom", base: env("AI_BASE_URL")!.replace(/\/+$/, ""), key: env("AI_API_KEY"), model: env("AI_MODEL")! });
  return list;
}

export const aiStatus = (keys?: AiKeys) => {
  const p = providers(keys);
  return { enabled: p.length > 0, providers: p.map((x) => x.name) };
};

// --- Per-visitor rate limit so a public deployment can't burn through a free quota ---
const hits = new Map<string, number[]>();
export function checkRate(ip: string, max?: number) {
  const limit = max ?? Number(env("AI_RATE_LIMIT") ?? 40); // requests per hour per visitor
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
  const res = await httpRequest(`${p.base}/chat/completions`, {
    method: "POST",
    timeoutMs: 60_000,
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
  });
  if (!res.ok) return { ok: false as const, status: res.status, text: res.text };
  let json: { choices?: { message?: { content?: unknown } }[] } | null = null;
  try {
    json = JSON.parse(res.text);
  } catch {}
  const content: unknown = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) return { ok: false as const, status: 502, text: "empty response" };
  return { ok: true as const, content };
}

/** Asks the configured AI for a JSON object. Tries each provider in turn. */
export async function askJson(system: string, user: string, maxTokens = 1500, keys?: AiKeys): Promise<{ data: Record<string, unknown>; provider: string }> {
  const list = providers(keys);
  if (!list.length) throw new AiError("AI isn't set up yet. Add a free API key to enable it (Settings, or the README for the server version).", "not_configured", 503);

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
