// Optional "hosted helper": a normal server deployment of this same app that holds the AI and local-job keys, so
// people using the static site or the phone apps get AI and local jobs without pasting any key.
// Set NEXT_PUBLIC_API_URL when building the static / mobile app (see README, "Hosted helper").
import { httpRequest } from "./http";
import type { Job, UserLocation } from "./types";

const clean = (u?: string) => u?.trim().replace(/\/+$/, "") || "";
export const HELPER_URL = clean(process.env.NEXT_PUBLIC_API_URL);

export class HelperError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function helperPost<T>(path: string, body: unknown, timeoutMs = 60_000): Promise<T> {
  if (!HELPER_URL) throw new HelperError("No helper configured");
  let r;
  try {
    r = await httpRequest(`${HELPER_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      timeoutMs,
    });
  } catch {
    throw new HelperError("Couldn't reach the CV Tracker server. Check your connection and try again.");
  }
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(r.text);
  } catch {}
  if (!r.ok) throw new HelperError(String(json?.error ?? "Request failed"), json?.code as string | undefined);
  return json as T;
}

export async function helperGet<T>(path: string): Promise<T> {
  if (!HELPER_URL) throw new HelperError("No helper configured");
  const r = await httpRequest(`${HELPER_URL}${path}`, { timeoutMs: 15_000 });
  if (!r.ok) throw new HelperError("Request failed");
  return JSON.parse(r.text) as T;
}

/** Local on-site jobs (Jooble / Adzuna) from the helper. Never throws: the app works without them. */
export async function helperLocalJobs(terms: string[], user: UserLocation): Promise<Job[]> {
  if (!HELPER_URL) return [];
  try {
    return (await helperPost<{ jobs: Job[] }>("/api/local-jobs", { terms, country: user.country, city: user.city }, 20_000)).jobs ?? [];
  } catch {
    return [];
  }
}
