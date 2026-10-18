import { Capacitor, CapacitorHttp } from "@capacitor/core";

export type HttpInit = { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number };
export type HttpResult = { ok: boolean; status: number; text: string };

/** True inside the Android / iOS app (a Capacitor WebView). */
export const isNative = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * One way to make a request everywhere:
 *   - in the Android/iOS apps it goes through the phone's native HTTP stack, so the browser's cross-origin rules
 *     (CORS) don't apply and every job board and AI provider can be reached;
 *   - on a server or in a normal browser it is a plain fetch.
 */
export async function httpRequest(url: string, init: HttpInit = {}): Promise<HttpResult> {
  const method = init.method ?? "GET";
  if (isNative()) {
    const r = await CapacitorHttp.request({
      url,
      method,
      headers: init.headers,
      data: init.body ? JSON.parse(init.body) : undefined,
      connectTimeout: init.timeoutMs,
      readTimeout: init.timeoutMs,
      responseType: "text",
    });
    const text = typeof r.data === "string" ? r.data : JSON.stringify(r.data ?? "");
    return { ok: r.status >= 200 && r.status < 300, status: r.status, text };
  }
  const res = await fetch(url, {
    method,
    headers: init.headers,
    body: init.body,
    signal: init.timeoutMs ? AbortSignal.timeout(init.timeoutMs) : undefined,
  });
  return { ok: res.ok, status: res.status, text: await res.text().catch(() => "") };
}
