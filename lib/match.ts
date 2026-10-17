import type { Job } from "./jobs";
import type { Profile } from "./profile";

export type Scored = Job & { score: number; matched: string[]; why?: string };

export function scoreJobs(jobs: Job[], p: Profile): Scored[] {
  return jobs
    .map((j) => {
      const hay = `${j.title} ${j.tags.join(" ")} ${j.description}`.toLowerCase();
      const titleHay = j.title.toLowerCase();
      const matched = p.skills.filter((s) => hay.includes(s));
      const tagHay = j.tags.join(" ").toLowerCase();
      const inTitle = matched.filter((s) => titleHay.includes(s));
      const inTags = matched.filter((s) => tagHay.includes(s));
      // Skills in the title say what the job is about; description-only matches are weaker.
      let pts = matched.length * 4 + inTitle.length * 25 + inTags.length * 6;
      for (const t of p.titles) {
        const words = t.split(" ").filter((w) => w.length > 2);
        if (titleHay.includes(t)) pts += 25;
        else if (words.length && words.every((w) => titleHay.includes(w))) pts += 15;
      }
      const max = 60 + Math.min(p.skills.length, 8) * 4;
      return { ...j, matched, score: Math.min(100, Math.round((pts / max) * 100)) };
    })
    .filter((j) => j.score > 0)
    .sort((a, b) => b.score - a.score);
}
