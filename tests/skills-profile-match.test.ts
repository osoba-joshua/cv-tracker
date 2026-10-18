import { describe, expect, it } from "vitest";
import { SAMPLE_CV } from "@/lib/client";
import { rank, scoreJob } from "@/lib/match";
import { buildProfile, levelFromTitle, levelFromYears } from "@/lib/profile";
import { expandSkills, findSkills } from "@/lib/skills";
import type { Profile } from "@/lib/types";
import { makeJob } from "./helpers";

const NG = { country: "NG", city: "" };
const dev: Profile = { skills: ["React", "TypeScript", "Next.js", "Node.js", "CSS", "HTML"], titles: ["frontend developer"], years: 5, level: 2 };

describe("skill detection", () => {
  it("finds skills and aliases", () => {
    const s = findSkills("We use nodejs, ReactJS, Postgres and k8s. Experience with CI/CD.");
    expect(s).toEqual(expect.arrayContaining(["Node.js", "React", "PostgreSQL", "Kubernetes", "CI/CD"]));
  });
  it("avoids false positives from everyday words", () => {
    expect(findSkills("Join us to go to market with our product")).not.toContain("Go");
    expect(findSkills("A javascripty approach")).not.toContain("JavaScript");
    expect(findSkills("You will excel in a fast-paced team and express interest early")).not.toEqual(expect.arrayContaining(["Excel"]));
    expect(findSkills("You will excel in a fast-paced team and express interest early")).not.toContain("Express");
    expect(findSkills("Swift delivery matters. Unity of purpose. Spring 2026 launch. We prefer rust-free code.")).toEqual([]);
  });
  it("still finds those skills when they really are skills", () => {
    expect(findSkills("Backend services in Go, Python and SQL")).toEqual(expect.arrayContaining(["Go", "Python", "SQL"]));
    expect(findSkills("Experience with golang")).toContain("Go");
    expect(findSkills("Skills: Excel, Word, PowerPoint")).toContain("Excel");
    expect(findSkills("Advanced Excel and VLOOKUP reporting")).toContain("Excel");
    expect(findSkills("Node.js with ExpressJS")).toContain("Express");
    expect(findSkills("iOS apps in Swift and Kotlin")).toEqual(expect.arrayContaining(["Swift", "Kotlin"]));
    expect(findSkills("Games built with Unity, C# and Blender")).toEqual(expect.arrayContaining(["Unity", "Blender"]));
    expect(findSkills("Java Spring Boot microservices")).toContain("Spring");
  });
  it("expands implied skills", () => {
    expect(expandSkills(["React", "TypeScript"])).toContain("JavaScript");
    expect(expandSkills(["Django"])).toContain("Python");
  });
});

describe("profile", () => {
  it("reads the sample CV", () => {
    const p = buildProfile(SAMPLE_CV);
    expect(p.skills).toEqual(expect.arrayContaining(["React", "TypeScript", "Next.js", "Figma", "GraphQL"]));
    expect(p.titles.join(" ")).toMatch(/developer/);
    expect(p.years).toBeGreaterThanOrEqual(5);
    expect(p.level).not.toBeNull();
  });
  it("maps titles and years to levels", () => {
    expect(levelFromTitle("Senior Backend Engineer")).toBe(3);
    expect(levelFromTitle("Junior QA")).toBe(1);
    expect(levelFromTitle("Engineering Manager")).toBe(4);
    expect(levelFromTitle("Marketing Intern")).toBe(0);
    expect(levelFromYears(0)).toBe(0);
    expect(levelFromYears(4)).toBe(2);
    expect(levelFromYears(12)).toBe(4);
  });
});

describe("scoring", () => {
  const strong = makeJob({ title: "Frontend Developer", description: "React, TypeScript and Next.js with CSS and HTML", location: "Worldwide" });
  const weak = makeJob({ title: "Frontend Developer", description: "Mostly React. Also Java, AWS, Kubernetes, Terraform and Go.", id: "weak" });
  const unrelated = makeJob({ title: "Truck Driver", description: "Drive trucks safely", id: "truck" });

  it("scores a strong match above a weak one", () => {
    expect(scoreJob(strong, dev, NG)!.score).toBeGreaterThan(scoreJob(weak, dev, NG)!.score);
  });
  it("drops unrelated jobs unless the user searched for them", () => {
    expect(scoreJob(unrelated, dev, NG)).toBeNull();
    expect(scoreJob(unrelated, dev, NG, true)).not.toBeNull();
  });
  it("explains the score", () => {
    const s = scoreJob(strong, dev, NG)!;
    expect(s.matched).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(s.parts.skills).toBeGreaterThan(80);
    expect(s.parts.level).toBeNull(); // title has no seniority wording
  });
  it("does not report implied skills as missing", () => {
    const j = makeJob({ title: "React Engineer", description: "React and JavaScript", id: "imp" });
    const s = scoreJob(j, { ...dev, skills: ["React", "TypeScript"] }, NG)!;
    expect(s.missing).not.toContain("JavaScript");
  });
  it("lowers the score for a big seniority gap", () => {
    // Partial skill overlap keeps both scores below the 99 cap so the penalty is visible
    const lead = makeJob({ title: "Lead Frontend Developer", description: "React, TypeScript, Java, AWS, Docker, Kubernetes", id: "lead" });
    const entry = makeJob({ title: "Junior Frontend Developer", description: "React, TypeScript, Java, AWS, Docker, Kubernetes", id: "entry" });
    const junior: Profile = { ...dev, level: 0 };
    expect(scoreJob(lead, junior, NG)!.score).toBeLessThan(scoreJob(entry, junior, NG)!.score);
  });
  it("gives jobs in the user's own country a small bonus and keeps abroad jobs from crowding them out", () => {
    const local = makeJob({ title: "Frontend Developer", description: "React, TypeScript, Next.js", location: "Lagos, Nigeria", remote: false, id: "ng" });
    const abroad = makeJob({ title: "Frontend Developer", description: "React, TypeScript, Next.js", location: "Berlin, Germany", remote: false, id: "de" });
    const r = rank([abroad, local], dev, NG);
    expect(r[0].id).toBe("ng");
    expect(r[0].loc).toBe("local");
    expect(r[1].loc).toBe("abroad");
  });
});
