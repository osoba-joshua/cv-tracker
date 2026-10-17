import { normText } from "./text";
import type { Job } from "./types";

/**
 * Search syntax:  react developer   ->  both words must appear (synonyms handled: developer = engineer)
 *                 "product manager" ->  exact phrase
 *                 -senior           ->  must NOT contain
 */
export type Query = { terms: string[]; phrases: string[]; exclude: string[] };

export function parseQuery(q: string): Query {
  const out: Query = { terms: [], phrases: [], exclude: [] };
  for (const m of q.matchAll(/"([^"]+)"|(\S+)/g)) {
    if (m[1]) out.phrases.push(normText(m[1]));
    else if (m[2].startsWith("-") && m[2].length > 1) out.exclude.push(normText(m[2].slice(1)));
    else out.terms.push(...normText(m[2]).split(" ").filter(Boolean));
  }
  return out;
}

export const isEmptyQuery = (q: Query) => !q.terms.length && !q.phrases.length && !q.exclude.length;

/** Plain-text version of a query (for asking the job boards). */
export const queryText = (q: Query) => [...q.phrases, ...q.terms].join(" ");

export function matches(hay: string, q: Query): boolean {
  return (
    q.terms.every((t) => hay.includes(t)) &&
    q.phrases.every((p) => hay.includes(p)) &&
    !q.exclude.some((x) => hay.includes(x))
  );
}

/** What a search looks at: everything about the job a person might type. */
export function haystack(j: Pick<Job, "title" | "company" | "location" | "tags" | "skills" | "description">, full = false): string {
  const desc = full ? j.description : j.description.slice(0, 400);
  return normText(`${j.title} ${j.company} ${j.location} ${j.tags.join(" ")} ${j.skills.join(" ")} ${desc}`);
}

/** Words to highlight in results (original spelling is matched case-insensitively). */
export function highlightTerms(q: Query): string[] {
  return [...q.phrases, ...q.terms].filter((t) => t.length > 1);
}
