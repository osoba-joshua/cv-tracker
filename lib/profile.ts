export type Profile = { skills: string[]; titles: string[]; yearsExperience: number | null };

const SKILLS = [
  "javascript", "typescript", "react", "next.js", "vue", "angular", "svelte", "node", "express", "python", "django", "flask", "fastapi",
  "java", "spring", "kotlin", "swift", "swiftui", "ios", "android", "c#", ".net", "c++", "go", "rust", "ruby", "rails", "php", "laravel",
  "sql", "postgres", "mysql", "mongodb", "redis", "graphql", "rest", "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "linux",
  "git", "ci/cd", "html", "css", "tailwind", "figma", "ux", "ui design", "data analysis", "pandas", "machine learning", "pytorch", "tensorflow",
  "excel", "tableau", "power bi", "seo", "marketing", "sales", "project management", "agile", "scrum", "customer support", "accounting",
  "roblox", "lua", "unity", "blender", "3d modeling",
];

const escape = (s: string) => s.replace(/[.+*?^${}()|[\]\\/]/g, "\\$&");

export function buildProfile(text: string): Profile {
  const t = text.toLowerCase();
  const skills = SKILLS.filter((s) => new RegExp(`(^|[^a-z0-9+#.])${escape(s)}($|[^a-z0-9+#])`).test(t));
  const titles = new Set<string>();
  const titleRe = /\b((?:[a-z]+ ){0,2}(?:developer|engineer|designer|analyst|manager|scientist|architect|consultant|marketer|accountant|administrator|specialist|intern|lead))\b/g;
  for (const m of t.matchAll(titleRe)) {
    titles.add(m[1].trim());
    if (titles.size >= 6) break;
  }
  const yrs = [...t.matchAll(/(\d{1,2})\+?\s*years?/g)].map((m) => +m[1]).filter((n) => n < 40);
  return { skills, titles: [...titles], yearsExperience: yrs.length ? Math.max(...yrs) : null };
}
