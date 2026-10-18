import { describe, expect, it } from "vitest";
import { SAMPLE_CV } from "@/lib/client";
import { reviewCv } from "@/lib/cvReview";
import { computeInsights } from "@/lib/insights";
import { rank } from "@/lib/match";
import { buildProfile } from "@/lib/profile";
import { makeJob } from "./helpers";

describe("CV review", () => {
  it("rates a well-formed CV highly", () => {
    const r = reviewCv(SAMPLE_CV, buildProfile(SAMPLE_CV));
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.grade).toMatch(/Excellent|Strong/);
    expect(r.checks.find((c) => c.id === "contact")?.status).toBe("pass");
    expect(r.checks.find((c) => c.id === "impact")?.status).toBe("pass");
    expect(r.stats.bullets).toBeGreaterThanOrEqual(6);
  });
  it("flags a thin CV with specific problems", () => {
    const thin = "John\nI was responsible for stuff and worked on things at a company.";
    const r = reviewCv(thin, buildProfile(thin));
    expect(r.score).toBeLessThan(40);
    expect(r.checks.find((c) => c.id === "contact")?.status).toBe("fail");
    expect(r.checks.find((c) => c.id === "weak")?.status).not.toBe("pass");
  });
  it("weights add up to 100", () => {
    const r = reviewCv(SAMPLE_CV, buildProfile(SAMPLE_CV));
    expect(r.checks.reduce((n, c) => n + c.weight, 0)).toBe(100);
  });
});

describe("insights", () => {
  const profile = { skills: ["React", "TypeScript"], titles: ["frontend developer"], years: 4, level: 2 as const };
  const jobs = rank(
    [
      makeJob({ id: "1", title: "Frontend Developer", description: "React, TypeScript, GraphQL", salary: "$100k – $120k", salaryMax: 120000, company: "Acme" }),
      makeJob({ id: "2", title: "React Engineer", description: "React, TypeScript, GraphQL and Docker", salary: "$110k – $130k", salaryMax: 130000, company: "Acme" }),
      makeJob({ id: "3", title: "Frontend Engineer", description: "React and TypeScript with Docker", salary: "$90k – $100k", salaryMax: 100000, company: "Globex" }),
      makeJob({ id: "4", title: "Frontend Developer", description: "React, TypeScript, GraphQL", salary: "$95k – $110k", salaryMax: 110000, company: "Initech" }),
      makeJob({ id: "5", title: "React Developer", description: "React TypeScript", salary: "$120k – $140k", salaryMax: 140000, company: "Hooli" }),
    ],
    profile,
    { country: "", city: "" },
  );
  const ins = computeInsights(jobs, profile);

  it("counts totals and finds skill gaps", () => {
    expect(ins.total).toBe(5);
    expect(ins.skillGaps[0].skill).toBe("GraphQL");
    expect(ins.skillGaps[0].jobs).toBe(3);
    expect(ins.skillGaps.find((g) => g.skill === "Docker")?.jobs).toBe(2);
  });
  it("counts how many jobs a skill would unlock", () => {
    expect(ins.skillGaps.find((g) => g.skill === "GraphQL")?.unlocks).toBeGreaterThan(0);
  });
  it("summarises salaries in USD", () => {
    expect(ins.salary?.n).toBe(5);
    expect(ins.salary?.max).toBe(140000);
    expect(ins.salary?.buckets.length).toBe(6);
  });
  it("ranks companies by openings", () => {
    expect(ins.companies[0]).toMatchObject({ name: "Acme", jobs: 2 });
  });
});
