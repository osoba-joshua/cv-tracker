export type Level = 0 | 1 | 2 | 3 | 4; // intern, junior, mid, senior, lead+

export const LEVEL_NAMES = ["Intern", "Junior", "Mid", "Senior", "Lead+"] as const;

export type Profile = {
  skills: string[];
  titles: string[];
  years: number | null;
  level: Level | null;
  // Filled in when the optional AI reads the CV
  summary?: string;
  strengths?: string[];
};

export type JobGeo = { worldwide: boolean; countries: string[]; regions: string[] };

export type UserLocation = { country: string; city: string };

export type Job = {
  id: string;
  title: string;
  company: string;
  logo?: string;
  location: string;
  remote: boolean;
  url: string;
  source: string;
  sourceUrl: string;
  description: string;
  tags: string[];
  skills: string[];
  jobType?: string;
  salary?: string;
  salaryMax?: number; // yearly, for sorting
  postedAt?: string;
  level?: Level;
  geo: JobGeo;
};

export type ScoredJob = Job & {
  loc: "local" | "remote" | "abroad";
  score: number;
  matched: string[];
  missing: string[];
};

export type SearchResponse = {
  total: number;
  localSources: { adzuna: boolean; jooble: boolean };
  results: ScoredJob[];
  sources: Record<string, number>;
};
