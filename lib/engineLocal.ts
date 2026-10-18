// Runs the whole app inside the browser or the Android/iOS WebView: no server needed.
// Job feeds are fetched directly (the native apps bypass CORS through Capacitor's HTTP layer; in a normal
// browser, feeds that don't allow cross-origin requests are skipped). AI uses keys the person pastes into Settings.
import { AiError, aiStatus, type AiKeys } from "./ai";
import { CoreError, coreAiCv, coreAiJob, coreAiProfile, coreJob, coreParse, coreSearch, coreStats } from "./core";
import { EngineError, type Engine } from "./engine";
import { HELPER_URL, HelperError, helperGet, helperPost } from "./helper";

// With a hosted helper configured, people who haven't pasted their own AI key use the helper's.
const hasOwnKey = (k?: AiKeys) => !!(k && Object.values(k).some((v) => typeof v === "string" && v.trim()));
const viaHelper = (k?: AiKeys) => !!HELPER_URL && !hasOwnKey(k);
const ask = <T,>(path: string, body: unknown) =>
  wrap(async () => {
    try {
      return await helperPost<T>(path, body);
    } catch (e) {
      if (e instanceof HelperError) throw new EngineError(e.message, e.code);
      throw e;
    }
  });

async function wrap<T>(fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof CoreError || e instanceof AiError) throw new EngineError(e.message, (e as { code?: string }).code);
    if (e instanceof EngineError) throw e;
    throw new EngineError(e instanceof Error ? e.message : "Something went wrong");
  }
}

export const localEngine: Engine = {
  mode: "local",
  parseFile: (file) =>
    wrap(async () => {
      if (file.size > 5_000_000) throw new CoreError("CV too large (max 5MB)");
      const { cvToText } = await import("./cv"); // loads the PDF reader only when needed
      return coreParse(await cvToText(file));
    }),
  parseText: (text) => wrap(() => coreParse(text)),
  search: (body) => wrap(() => coreSearch(body)),
  job: (id) => wrap(() => coreJob(id)),
  stats: () => coreStats(),
  aiStatus: async (keys?: AiKeys) => {
    if (viaHelper(keys)) {
      // A free host that has gone to sleep needs up to ~a minute to wake, so wait and retry before giving up
      for (let i = 0; i < 3; i++) {
        try {
          return await helperGet<{ enabled: boolean; providers: string[] }>("/api/ai/status", 60_000);
        } catch {
          if (i < 2) await new Promise((r) => setTimeout(r, 3000));
        }
      }
      return { enabled: false, providers: [] };
    }
    return aiStatus(keys ?? {});
  },
  aiProfile: (text, keys) => (viaHelper(keys) ? ask("/api/ai/profile", { text }) : wrap(async () => (await coreAiProfile(text, keys ?? {})) as never)),
  aiJob: (body, keys) => (viaHelper(keys) ? ask("/api/ai/job", body) : wrap(async () => (await coreAiJob(body, keys ?? {})) as never)),
  aiCv: (body, keys) => (viaHelper(keys) ? ask("/api/ai/cv", body) : wrap(async () => (await coreAiCv(body, keys ?? {})) as never)),
};
