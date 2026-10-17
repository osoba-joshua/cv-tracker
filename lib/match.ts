import { classify } from "./geo";
import { SOFT_SKILLS } from "./skills";
import type { Job, Profile, ScoredJob, UserLocation } from "./types";

const ROLE_WORDS = /developer|engineer|designer|analyst|manager|scientist|architect|consultant|marketer|accountant|writer|recruiter|specialist/;

export function scoreJob(job: Job, p: Profile, user: UserLocation): ScoredJob | null {
  const mine = new Set(p.skills.map((s) => s.toLowerCase()));
  const titleLc = job.title.toLowerCase();
  const tagsLc = job.tags.join(" ").toLowerCase();

  const weight = (skill: string) => {
    const s = skill.toLowerCase();
    const base = SOFT_SKILLS.has(skill) ? 0.35 : 1;
    return base + (titleLc.includes(s) ? 2 : 0) + (tagsLc.includes(s) ? 0.5 : 0);
  };

  const matched = job.skills.filter((s) => mine.has(s.toLowerCase()));
  const missing = job.skills.filter((s) => !mine.has(s.toLowerCase()) && !SOFT_SKILLS.has(s));

  // Skills in the job title may not be in the detected list (e.g. "Rails" via alias), so also check raw title words.
  const titleHits = p.skills.filter((s) => titleLc.includes(s.toLowerCase()) && !matched.includes(s));
  matched.push(...titleHits);

  // Title / role fit
  let titleFit = 0;
  for (const t of p.titles) {
    const words = t.split(" ").filter((w) => w.length > 2);
    if (!words.length) continue;
    if (titleLc.includes(t) && words.length > 1) titleFit = Math.max(titleFit, 1);
    else if (words.length > 1 && words.every((w) => titleLc.includes(w))) titleFit = Math.max(titleFit, 0.7);
    else {
      const role = words.find((w) => ROLE_WORDS.test(w));
      if (role && titleLc.includes(role)) titleFit = Math.max(titleFit, 0.35);
    }
  }

  const hard = matched.filter((s) => !SOFT_SKILLS.has(s));
  const inTitle = hard.some((s) => titleLc.includes(s.toLowerCase()));
  // Need real evidence: a core skill in the title, 2+ core skills, or a strong title match.
  if (!inTitle && hard.length < 2 && titleFit < 0.7) return null;

  const jobWeight = job.skills.reduce((n, s) => n + weight(s), 0) || 1;
  const gotWeight = matched.reduce((n, s) => n + weight(s), 0);
  const coverage = Math.min(gotWeight / jobWeight, 1);
  const breadth = Math.min(hard.length / 5, 1);

  let score = 0.5 * coverage + 0.3 * breadth + 0.2 * titleFit;

  // Seniority mismatch (e.g. a Lead role for a junior CV) lowers the score.
  if (p.level !== null && job.level !== undefined) {
    const gap = Math.abs(p.level - job.level);
    if (gap >= 2) score *= 0.75;
    else if (gap === 1) score *= 0.92;
  }

  const loc = classify(job, user);
  let pct = Math.round(score * 100);
  if (loc === "local") pct += 6; // jobs in your own country rank a little higher
  if (loc === "abroad") pct -= 3;

  return {
    ...job,
    loc,
    matched: [...new Set(matched)],
    missing: missing.slice(0, 8),
    score: Math.max(1, Math.min(99, pct)),
  };
}

export function rank(jobs: Job[], p: Profile, user: UserLocation): ScoredJob[] {
  const scored = jobs
    .map((j) => scoreJob(j, p, user))
    .filter((j): j is ScoredJob => j !== null)
    .sort((a, b) => b.score - a.score);
  // Keep room for jobs you can actually take: abroad jobs can't crowd them out.
  const near = scored.filter((j) => j.loc !== "abroad").slice(0, 170);
  const abroad = scored.filter((j) => j.loc === "abroad").slice(0, 60);
  return [...near, ...abroad].sort((a, b) => b.score - a.score);
}
