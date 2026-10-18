"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ScoredJob } from "./types";

/** localStorage-backed state that is safe for SSR (starts with `initial`, loads after mount). */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setValue(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, [key]);
  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [key],
  );
  return [value, set, ready] as const;
}

export function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    t.current = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t.current);
  }, [value, ms]);
  return v;
}

export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(d)) return "";
  const h = d / 36e5;
  if (h < 1) return "just now";
  if (h < 24) return `${Math.floor(h)}h ago`;
  const days = h / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/** Job ids the user has already been shown, so we can flag what is new on their next visit. */
export function getSeen(): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem("cvt:seen") || "[]"));
  } catch {
    return new Set();
  }
}
export function markSeen(ids: string[]) {
  try {
    const s = getSeen();
    ids.forEach((i) => s.add(i));
    localStorage.setItem("cvt:seen", JSON.stringify([...s].slice(-4000)));
  } catch {}
}

export const ageDays = (iso?: string) => (iso ? (Date.now() - new Date(iso).getTime()) / 864e5 : Infinity);

export type Stage = "saved" | "applied" | "interview" | "offer" | "rejected";
export const STAGES: { id: Stage; label: string }[] = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interview", label: "Interviewing" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
];

/** Compact copy of a job stored in the tracker (descriptions are dropped to keep storage small). */
export type Tracked = {
  job: Omit<ScoredJob, "description">;
  stage: Stage;
  note: string;
  followUp?: string; // YYYY-MM-DD reminder
  history?: { stage: Stage; at: string }[]; // every stage the job has been in
  savedAt: string;
  updatedAt: string;
};

export const isDue = (t: Tracked) => !!t.followUp && t.stage !== "rejected" && t.stage !== "offer" && t.followUp <= new Date().toISOString().slice(0, 10);

/** Where the user is based and whether to show jobs outside that country. */
export type Loc = { country: string; city: string; abroad: boolean; manual: boolean };
export const DEFAULT_LOC: Loc = { country: "", city: "", abroad: false, manual: false };

export function toCsv(items: Tracked[]): string {
  const esc = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const rows = [["Title", "Company", "Stage", "Match", "Location", "Salary", "Source", "Link", "Saved", "Follow up", "Note"]];
  for (const t of items) {
    rows.push([t.job.title, t.job.company, t.stage, `${t.job.score}%`, t.job.location, t.job.salary ?? "", t.job.source, t.job.url, t.savedAt.slice(0, 10), t.followUp ?? "", t.note]);
  }
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export const SAMPLE_CV = `Alex Morgan
Frontend Developer
alex.morgan@example.com | +1 555 010 0199 | linkedin.com/in/alex-morgan-sample | github.com/alex-morgan-sample

Summary
Frontend developer with 5 years of experience building fast, accessible web apps in React and TypeScript. Led a design system used by 40+ engineers and cut page load times by 45%.

Skills
React, TypeScript, Next.js, Node.js, Tailwind CSS, HTML, CSS, GraphQL, Jest, Git, Figma, Python, SQL, Docker, CI/CD, Agile

Experience
Frontend Developer, Northwind Labs (2022 - present)
- Led a React and TypeScript design system adopted by 6 product teams, reducing UI bugs by 30%
- Improved Lighthouse performance scores from 62 to 96 by introducing code splitting and image optimization
- Mentored 3 junior developers and introduced code review guidelines across a team of 12
- Built a GraphQL data layer that cut API calls per page by 50%

UI Designer and Developer, Studio Lark (2020 - 2022)
- Designed and prototyped product interfaces in Figma for 15+ clients
- Shipped 20 marketing sites with Next.js and Tailwind CSS, increasing average conversion by 18%
- Automated deployments with CI/CD, saving 10 hours per week

Education
BSc Computer Science, University of Lagos (2016 - 2020)`;
