import { expect, it, vi } from "vitest";

const request = vi.fn();
vi.mock("@/lib/http", () => ({ isNative: () => false, httpRequest: (...a: unknown[]) => request(...a) }));

it("local jobs from the helper never throw when it is down", async () => {
  request.mockRejectedValue(new Error("offline"));
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://helper.example.com");
  vi.resetModules();
  const { helperLocalJobs } = await import("@/lib/helper");
  expect(await helperLocalJobs(["developer"], { country: "DE", city: "" })).toEqual([]);
  expect(request).toHaveBeenCalled();
});
