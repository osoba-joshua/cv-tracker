import { parseGeo } from "@/lib/geo";
import { levelFromTitle } from "@/lib/profile";
import { findSkills } from "@/lib/skills";
import type { Job } from "@/lib/types";

/** Builds a realistic Job for tests (skills, geography and seniority are derived the way the app does it). */
export function makeJob(p: Partial<Job> & { title: string }): Job {
  const description = p.description ?? "";
  const location = p.location ?? "Worldwide";
  const tags = p.tags ?? [];
  const base: Job = {
    id: `t-${p.title}`,
    title: p.title,
    company: "Acme",
    location,
    remote: true,
    url: "https://example.com/job",
    source: "Test",
    sourceUrl: "https://example.com",
    description,
    tags,
    skills: findSkills(`${p.title} ${tags.join(" ")} ${description}`),
    geo: parseGeo(location),
    level: levelFromTitle(p.title),
  };
  return { ...base, ...p };
}
