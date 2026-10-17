import { findSkills } from "./skills";
import type { Level, Profile } from "./types";

const ROLE = "developer|engineer|designer|analyst|manager|scientist|architect|consultant|marketer|accountant|administrator|specialist|intern|writer|recruiter|nurse|teacher|director|coordinator|representative|programmer|tester";
const STOP = new Set(["a", "an", "the", "and", "as", "of", "for", "at", "in", "to", "with", "ui", "my", "i", "am", "was", "worked", "also", "senior", "junior", "lead"]);

export function levelFromTitle(title: string): Level | undefined {
  const t = title.toLowerCase();
  if (/\b(intern|internship|trainee|apprentice|werkstudent|praktikum)\b/.test(t)) return 0;
  if (/\b(junior|jr\.?|entry|graduate|associate)\b/.test(t)) return 1;
  if (/\b(lead|staff|principal|head|director|vp|chief|manager)\b/.test(t)) return 4;
  if (/\b(senior|sr\.?)\b/.test(t)) return 3;
  return undefined;
}

export function levelFromYears(y: number): Level {
  return y < 1 ? 0 : y < 3 ? 1 : y < 6 ? 2 : y < 10 ? 3 : 4;
}

export function buildProfile(text: string): Profile {
  const skills = findSkills(text);

  const titles: string[] = [];
  const re = new RegExp(`\\b((?:[a-z][a-z/+.#-]+ ){0,2}(?:${ROLE}))\\b`, "gi");
  for (const m of text.matchAll(re)) {
    const words = m[1].toLowerCase().split(" ").filter((w) => !STOP.has(w));
    const t = words.join(" ");
    if (words.length && !titles.includes(t) && !/^(the|a)\b/.test(t)) titles.push(t);
    if (titles.length >= 5) break;
  }

  const yrs = [...text.matchAll(/(\d{1,2})\+?\s*(?:years?|yrs?)\b(?!\s*old)/gi)].map((m) => +m[1]).filter((n) => n > 0 && n < 40);
  const years = yrs.length ? Math.max(...yrs) : null;

  const explicit = levelFromTitle(titles.join(" ") + " " + text.slice(0, 300));
  const level = explicit ?? (years !== null ? levelFromYears(years) : null);

  return { skills, titles, years, level };
}
