// Runs the whole app inside the browser or the Android/iOS WebView: no server needed.
// Job feeds are fetched directly (the native apps bypass CORS through Capacitor's HTTP layer; in a normal
// browser, feeds that don't allow cross-origin requests are skipped). AI uses keys the person pastes into Settings.
import { AiError, aiStatus, type AiKeys } from "./ai";
import { CoreError, coreAiCv, coreAiJob, coreAiProfile, coreJob, coreParse, coreSearch, coreStats } from "./core";
import { EngineError, type Engine } from "./engine";

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
  aiStatus: async (keys?: AiKeys) => aiStatus(keys ?? {}),
  aiProfile: (text, keys) => wrap(async () => (await coreAiProfile(text, keys ?? {})) as never),
  aiJob: (body, keys) => wrap(async () => (await coreAiJob(body, keys ?? {})) as never),
  aiCv: (body, keys) => wrap(async () => (await coreAiCv(body, keys ?? {})) as never),
};
