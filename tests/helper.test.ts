import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The "hosted helper": the static site / phone apps send AI and local-job requests to a server that holds the keys.
const request = vi.fn();
vi.mock("@/lib/http", () => ({
  isNative: () => false,
  httpRequest: (...a: unknown[]) => request(...a),
}));

const load = async (url: string) => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", url);
  return import("@/lib/engineLocal");
};

beforeEach(() => request.mockReset());
afterEach(() => vi.unstubAllEnvs());

describe("hosted helper", () => {
  it("sends AI requests to the helper when the person has no key of their own", async () => {
    request.mockResolvedValue({ ok: true, status: 200, text: JSON.stringify({ result: { verdict: "strong" }, provider: "Gemini" }) });
    const { localEngine } = await load("https://helper.example.com/");
    const cv = "x".repeat(60);
    const r = await localEngine.aiJob({ task: "fit", cv, job: { title: "Dev" } }, {});
    expect(r.provider).toBe("Gemini");
    const [url, init] = request.mock.calls[0];
    expect(url).toBe("https://helper.example.com/api/ai/job");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).task).toBe("fit");
  });

  it("reports the helper's AI status", async () => {
    request.mockResolvedValue({ ok: true, status: 200, text: '{"enabled":true,"providers":["Gemini"]}' });
    const { localEngine } = await load("https://helper.example.com");
    expect(await localEngine.aiStatus({})).toEqual({ enabled: true, providers: ["Gemini"] });
    expect(request.mock.calls[0][0]).toBe("https://helper.example.com/api/ai/status");
  });

  it("surfaces the helper's error message and code", async () => {
    request.mockResolvedValue({ ok: false, status: 429, text: '{"error":"Too many requests","code":"rate_limited"}' });
    const { localEngine } = await load("https://helper.example.com");
    await expect(localEngine.aiCv({ cv: "x".repeat(100) }, {})).rejects.toMatchObject({ message: "Too many requests", code: "rate_limited" });
  });

  it("uses the person's own key on-device instead of the helper", async () => {
    request.mockResolvedValue({ ok: true, status: 200, text: JSON.stringify({ choices: [{ message: { content: '{"headline":"ok"}' } }] }) });
    const { localEngine } = await load("https://helper.example.com");
    await localEngine.aiCv({ cv: "x".repeat(100) }, { groq: "gsk_mine" });
    expect(request.mock.calls[0][0]).toContain("api.groq.com");
  });

  it("does nothing without a helper URL", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const { HELPER_URL, helperLocalJobs } = await import("@/lib/helper");
    expect(HELPER_URL).toBe("");
    expect(await helperLocalJobs(["x"], { country: "DE", city: "" })).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });
});
