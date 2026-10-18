import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Simulate the Capacitor native layer so the Android/iOS code paths can be tested without a phone.
const state = { native: false };
const nativeRequest = vi.fn();
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => state.native },
  CapacitorHttp: { request: (...a: unknown[]) => nativeRequest(...a) },
}));

import { askJson } from "@/lib/ai";
import { httpRequest, isNative } from "@/lib/http";

beforeEach(() => {
  state.native = false;
  nativeRequest.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe("httpRequest on the web / server", () => {
  it("uses fetch and returns status and text", async () => {
    const fetchMock = vi.fn(async () => new Response('{"a":1}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await httpRequest("https://example.com/x", { method: "POST", headers: { a: "b" }, body: '{"q":1}' });
    expect(r).toEqual({ ok: true, status: 200, text: '{"a":1}' });
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/x", expect.objectContaining({ method: "POST", body: '{"q":1}' }));
    expect(nativeRequest).not.toHaveBeenCalled();
  });
  it("reports failures without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 429 })));
    expect(await httpRequest("https://example.com")).toMatchObject({ ok: false, status: 429, text: "nope" });
  });
});

describe("httpRequest inside the Android / iOS app", () => {
  beforeEach(() => {
    state.native = true;
  });

  it("detects the native platform", () => {
    expect(isNative()).toBe(true);
  });

  it("goes through the native HTTP layer, never fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    nativeRequest.mockResolvedValue({ status: 200, data: '[{"id":1}]' });
    const r = await httpRequest("https://remoteok.com/api", { headers: { Accept: "application/json" }, timeoutMs: 9000 });
    expect(r).toEqual({ ok: true, status: 200, text: '[{"id":1}]' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(nativeRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://remoteok.com/api", method: "GET", connectTimeout: 9000, readTimeout: 9000, responseType: "text" }),
    );
  });

  it("sends JSON bodies as objects and maps error statuses", async () => {
    nativeRequest.mockResolvedValue({ status: 429, data: "slow down" });
    const r = await httpRequest("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { authorization: "Bearer k" }, body: '{"model":"m"}' });
    expect(r).toMatchObject({ ok: false, status: 429, text: "slow down" });
    expect(nativeRequest).toHaveBeenCalledWith(expect.objectContaining({ method: "POST", data: { model: "m" } }));
  });

  it("copes with structured data from the native layer", async () => {
    nativeRequest.mockResolvedValue({ status: 200, data: { ok: true } });
    expect((await httpRequest("https://example.com")).text).toBe('{"ok":true}');
  });

  it("lets the AI client work on-device with keys from Settings", async () => {
    nativeRequest.mockResolvedValue({ status: 200, data: JSON.stringify({ choices: [{ message: { content: '{"answer":42}' } }] }) });
    const r = await askJson("system", "user", 100, { groq: "gsk_test" });
    expect(r).toEqual({ data: { answer: 42 }, provider: "Groq" });
    const sent = nativeRequest.mock.calls[0][0];
    expect(sent.url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(sent.headers.authorization).toBe("Bearer gsk_test");
  });
});
