/**
 * Normalises text so equivalent spellings compare equal:
 * "Front-End Developer" / "frontend engineer" / "Front end programmer" all become "frontend engineer".
 */
export function normText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/front[\s-]?end/g, "frontend")
    .replace(/back[\s-]?end/g, "backend")
    .replace(/full[\s-]?stack/g, "fullstack")
    .replace(/\b(developers?|programmers?|swe)\b/g, "engineer")
    .replace(/\bengineers\b/g, "engineer")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
