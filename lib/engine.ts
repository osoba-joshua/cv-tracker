// One interface for everything the UI needs from "the backend". Two implementations:
//   remote: calls this app's own /api routes (a normal server deployment)
//   local:  runs the same logic inside the browser/WebView (static web build, Android and iOS apps)
// The build picks one with NEXT_PUBLIC_ENGINE=local (static builds) or leaves it unset (server builds).
import type { AiKeys } from "./ai";
import { remoteEngine } from "./engineRemote";
import type { Profile, SearchResponse } from "./types";

export class EngineError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export type AiStatus = { enabled: boolean; providers: string[] };
export type Parsed = { profile: Profile; text: string };
export type Stats = { jobs: number; sources: number; countries: number };

export interface Engine {
  mode: "remote" | "local";
  parseFile(file: File): Promise<Parsed>;
  parseText(text: string): Promise<Parsed>;
  search(body: Record<string, unknown>): Promise<SearchResponse>;
  /** Full description of a job, or null when it is no longer cached. */
  job(id: string): Promise<string | null>;
  stats(): Promise<Stats>;
  aiStatus(keys?: AiKeys): Promise<AiStatus>;
  aiProfile(text: string, keys?: AiKeys): Promise<{ profile: Record<string, unknown>; provider: string }>;
  aiJob(body: Record<string, unknown>, keys?: AiKeys): Promise<{ result: Record<string, unknown>; provider: string }>;
  aiCv(body: Record<string, unknown>, keys?: AiKeys): Promise<{ result: Record<string, unknown>; provider: string }>;
}

export const ENGINE_MODE: "remote" | "local" = process.env.NEXT_PUBLIC_ENGINE === "local" ? "local" : "remote";

// The on-device engine (and its heavy dependencies, like the PDF reader) is loaded lazily, and only in static builds.
const lazy = <K extends keyof Omit<Engine, "mode">>(k: K) =>
  (async (...a: unknown[]) => {
    const { localEngine } = await import("./engineLocal");
    return (localEngine[k] as (...x: unknown[]) => unknown)(...a);
  }) as Engine[K];

const localProxy: Engine = {
  mode: "local",
  parseFile: lazy("parseFile"),
  parseText: lazy("parseText"),
  search: lazy("search"),
  job: lazy("job"),
  stats: lazy("stats"),
  aiStatus: lazy("aiStatus"),
  aiProfile: lazy("aiProfile"),
  aiJob: lazy("aiJob"),
  aiCv: lazy("aiCv"),
};

export const engine: Engine = process.env.NEXT_PUBLIC_ENGINE === "local" ? localProxy : remoteEngine;
