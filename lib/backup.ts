// Everything CV Tracker remembers lives in this browser (localStorage, keys start with "cvt:").
// Backup/restore lets people move it between devices or keep a copy.

const PREFIX = "cvt:";
const VERSION = 1;

export function exportBackup(): string {
  const data: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(PREFIX)) continue;
    if (k === "cvt:seen") continue; // bulky and device specific
    try {
      data[k] = JSON.parse(localStorage.getItem(k) as string);
    } catch {
      data[k] = localStorage.getItem(k);
    }
  }
  return JSON.stringify({ app: "cv-tracker", version: VERSION, exportedAt: new Date().toISOString(), data }, null, 2);
}

/** Returns the number of entries restored. Throws a readable error for bad files. */
export function importBackup(text: string): number {
  let parsed: { app?: string; data?: Record<string, unknown> };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (parsed.app !== "cv-tracker" || !parsed.data || typeof parsed.data !== "object") {
    throw new Error("That doesn't look like a CV Tracker backup.");
  }
  let n = 0;
  for (const [k, v] of Object.entries(parsed.data)) {
    if (!k.startsWith(PREFIX)) continue;
    localStorage.setItem(k, typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v));
    n++;
  }
  return n;
}

export function clearAllData() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

export function downloadFile(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}
