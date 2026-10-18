import type { Engine } from "./engine";
import { EngineError } from "./engine";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new EngineError("Network error. Check your connection and try again.");
  }
  let json: Record<string, unknown> | null = null;
  try {
    json = await res.json();
  } catch {}
  if (!res.ok) throw new EngineError(String(json?.error ?? "Request failed"), json?.code as string | undefined);
  return json as T;
}

const post = <T>(url: string, body: unknown) =>
  request<T>(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export const remoteEngine: Engine = {
  mode: "remote",
  parseFile(file) {
    const fd = new FormData();
    fd.append("cv", file);
    return request("/api/parse", { method: "POST", body: fd });
  },
  parseText: (text) => post("/api/parse", { text }),
  search: (body) => post("/api/search", body),
  async job(id) {
    try {
      return (await request<{ description: string }>(`/api/job?id=${encodeURIComponent(id)}`)).description;
    } catch {
      return null;
    }
  },
  stats: () => request("/api/stats"),
  aiStatus: () => request("/api/ai/status"),
  aiProfile: (text) => post("/api/ai/profile", { text }),
  aiJob: (body) => post("/api/ai/job", body),
  aiCv: (body) => post("/api/ai/cv", body),
};
