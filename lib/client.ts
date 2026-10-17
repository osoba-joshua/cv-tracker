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
  savedAt: string;
  updatedAt: string;
};

export function toCsv(items: Tracked[]): string {
  const esc = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const rows = [["Title", "Company", "Stage", "Match", "Location", "Salary", "Source", "Link", "Saved", "Note"]];
  for (const t of items) {
    rows.push([t.job.title, t.job.company, t.stage, `${t.job.score}%`, t.job.location, t.job.salary ?? "", t.job.source, t.job.url, t.savedAt.slice(0, 10), t.note]);
  }
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

export const SAMPLE_CV = `Alex Morgan — Frontend Developer
5 years of experience building fast, accessible web apps.

Skills: React, TypeScript, Next.js, Node.js, Tailwind CSS, HTML, CSS, GraphQL, Jest, Git, Figma
Also: Python, SQL, Docker, CI/CD, Agile teams

Experience
Frontend Developer, Northwind (2022–now): led a React and TypeScript design system, improved Lighthouse scores, mentored 3 junior developers.
UI Designer, Studio Lark (2020–2022): designed and prototyped product UI in Figma, shipped marketing sites.`;
