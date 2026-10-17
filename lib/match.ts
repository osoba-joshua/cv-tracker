import type { Job } from "./jobs";
import type { Profile } from "./profile";

export type Scored = Job & { score: number; matched: string[]; why?: string };

export function scoreJobs(jobs: Job[], p: Profile): Scored[] {
  return jobs
    .map((j) => {
      const hay = `${j.title} ${j.tags.join(" ")} ${j.description}`.toLowerCase();
      const titleHay = j.title.toLowerCase();
      const matched = p.skills.filter((s) => hay.includes(s));
      let pts = matched.length * 10;
      pts += matched.filter((s) => titleHay.includes(s)).length * 10;
      for (const t of p.titles) if (titleHay.includes(t)) pts += 25;
      const max = Math.max(p.skills.length * 10 + 25, 1);
      return { ...j, matched, score: Math.min(100, Math.round((pts / max) * 100)) };
    })
    .filter((j) => j.score > 0)
    .sort((a, b) => b.score - a.score);
}
