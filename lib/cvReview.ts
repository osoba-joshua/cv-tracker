import type { Profile } from "./types";

export type Check = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  tip?: string;
  weight: number;
};

export type CvReview = {
  score: number;
  grade: "Excellent" | "Strong" | "Needs work" | "Weak";
  checks: Check[];
  stats: { words: number; bullets: number; metrics: number; verbs: number };
};

const VERBS = new Set(
  `led built designed launched improved increased reduced delivered created managed developed implemented optimized optimised shipped
  automated migrated architected mentored coordinated negotiated analysed analyzed established drove grew scaled owned streamlined
  introduced redesigned refactored resolved secured trained presented organised organized produced generated saved won achieved
  directed spearheaded maintained integrated deployed tested wrote researched collaborated partnered supported executed planned
  transformed boosted cut accelerated simplified rebuilt enabled championed founded initiated`.split(/\s+/),
);

const WEAK = /\b(responsible for|duties included|worked on|helped with|assisted with|tasked with|in charge of)\b/gi;

const has = (t: string, re: RegExp) => re.test(t);

export function reviewCv(text: string, profile: Profile | null): CvReview {
  const t = text.replace(/\r/g, "");
  const words = (t.match(/\b[\p{L}\p{N}'’-]+\b/gu) ?? []).length;
  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[•\-*–▪●◦·]\s*\S/.test(l)).length;
  const metrics = (t.match(/(\d+(?:[.,]\d+)?\s?%|[$£€₦]\s?\d|\b\d+(?:[.,]\d+)?\s?(?:k|m|x)\b|\b\d{2,}\+?\s+(?:users|customers|clients|projects|people|team|engineers|members|countries|sales|downloads|visitors|products|employees))/gi) ?? []).length;
  const verbs = lines.filter((l) => VERBS.has(l.replace(/^[•\-*–▪●◦·\s]+/, "").split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, ""))).length;
  const weak = (t.match(WEAK) ?? []).length;
  const years = (t.match(/\b(19|20)\d{2}\b/g) ?? []).length;
  const iCount = (t.match(/\bI\b(?!\.)/g) ?? []).length;

  const email = has(t, /[\w.+-]+@[\w-]+\.[\w.-]+/);
  const phone = has(t, /(\+?\d[\d\s().-]{8,}\d)/);
  const links = has(t, /(linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com|portfolio|https?:\/\/)/i);
  const sections = {
    experience: has(t, /\b(work\s+)?experience\b|employment|career history|work history/i),
    education: has(t, /\beducation\b|\bdegree\b|university|bachelor|\bb\.?sc\b|\bm\.?sc\b/i),
    skills: has(t, /\bskills\b|technologies|tech stack|tools/i),
  };
  const sectionCount = Object.values(sections).filter(Boolean).length;
  const summary = has(t, /\b(summary|profile|about me|objective)\b/i);

  const checks: Check[] = [];
  const add = (c: Omit<Check, "status"> & { level: 0 | 1 | 2 }) => {
    const { level, ...rest } = c;
    checks.push({ ...rest, status: level === 2 ? "pass" : level === 1 ? "warn" : "fail" });
  };

  add({
    id: "length", label: "Length", weight: 10,
    level: words >= 250 && words <= 900 ? 2 : (words >= 150 && words < 250) || (words > 900 && words <= 1200) ? 1 : 0,
    detail: `${words} words`,
    tip: words < 250 ? "Add detail on what you did and achieved. Aim for roughly 350-700 words (1-2 pages)." : "Trim to the most relevant roles. Recruiters skim, so aim for 1-2 pages.",
  });
  add({
    id: "contact", label: "Contact details", weight: 10,
    level: email && phone ? 2 : email || phone ? 1 : 0,
    detail: email && phone ? "Email and phone found" : email ? "Email found, no phone" : phone ? "Phone found, no email" : "No email or phone found",
    tip: "Put a professional email and a phone number at the very top.",
  });
  add({
    id: "links", label: "Online presence", weight: 8,
    level: links ? 2 : 0,
    detail: links ? "Profile or portfolio link found" : "No LinkedIn, GitHub or portfolio link",
    tip: "Link your LinkedIn and, if relevant, GitHub or a portfolio. It builds trust fast.",
  });
  add({
    id: "sections", label: "Key sections", weight: 12,
    level: sectionCount === 3 ? 2 : sectionCount === 2 ? 1 : 0,
    detail: `Found: ${Object.entries(sections).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}`,
    tip: "Include clear Experience, Education and Skills sections so automated screening can parse them.",
  });
  add({
    id: "summary", label: "Professional summary", weight: 6,
    level: summary ? 2 : 1,
    detail: summary ? "Summary section found" : "No summary or profile section",
    tip: "Open with 2-3 lines on who you are, your strongest skills and what you want next.",
  });
  add({
    id: "impact", label: "Measurable impact", weight: 16,
    level: metrics >= 4 ? 2 : metrics >= 2 ? 1 : 0,
    detail: `${metrics} numbers, percentages or amounts`,
    tip: "Quantify results: “cut load time 40%”, “led a team of 5”, “grew signups to 12k”. Numbers are what hiring managers remember.",
  });
  add({
    id: "verbs", label: "Strong action verbs", weight: 12,
    level: verbs >= 6 ? 2 : verbs >= 3 ? 1 : 0,
    detail: `${verbs} lines start with an action verb`,
    tip: "Start bullets with verbs like built, led, launched, improved or reduced instead of describing duties.",
  });
  add({
    id: "weak", label: "Avoids weak phrases", weight: 6,
    level: weak === 0 ? 2 : weak <= 2 ? 1 : 0,
    detail: weak === 0 ? "No filler phrases" : `${weak} filler phrase${weak > 1 ? "s" : ""} (“responsible for”, “worked on”…)`,
    tip: "Replace “responsible for…” with what you actually achieved.",
  });
  add({
    id: "bullets", label: "Scannable bullets", weight: 6,
    level: bullets >= 6 ? 2 : bullets >= 3 ? 1 : 0,
    detail: `${bullets} bullet points`,
    tip: "Use short bullets (3-5 per role) rather than dense paragraphs.",
  });
  const skillCount = profile?.skills.length ?? 0;
  add({
    id: "skills", label: "Skills coverage", weight: 8,
    level: skillCount >= 10 ? 2 : skillCount >= 5 ? 1 : 0,
    detail: `${skillCount} recognised skills`,
    tip: "List the tools and skills you really use, spelled the way job posts spell them (e.g. “PostgreSQL”, “Project Management”).",
  });
  add({
    id: "dates", label: "Clear timeline", weight: 4,
    level: years >= 3 ? 2 : years >= 1 ? 1 : 0,
    detail: `${years} year${years === 1 ? "" : "s"} mentioned`,
    tip: "Add start and end dates to each role so the timeline is easy to follow.",
  });
  add({
    id: "tone", label: "Professional tone", weight: 2,
    level: iCount <= 2 ? 2 : 1,
    detail: iCount <= 2 ? "Reads in a crisp CV voice" : `“I” used ${iCount} times`,
    tip: "Drop “I” and write in implied first person: “Built…” not “I built…”.",
  });

  const score = Math.round(checks.reduce((n, c) => n + c.weight * (c.status === "pass" ? 1 : c.status === "warn" ? 0.5 : 0), 0));
  const grade = score >= 85 ? "Excellent" : score >= 70 ? "Strong" : score >= 50 ? "Needs work" : "Weak";
  return { score, grade, checks, stats: { words, bullets, metrics, verbs } };
}
