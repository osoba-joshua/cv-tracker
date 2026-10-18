// Everything CV Tracker remembers lives in this browser (localStorage, keys start with "cvt:").
// Backup/restore lets people move it between devices or keep a copy.

import { isNative } from "./http";

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

export async function downloadFile(name: string, content: string, type = "application/json") {
  if (isNative()) {
    // WebViews can't save blob downloads, so write a temp file and hand it to the system share sheet
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
    const file = await Filesystem.writeFile({ path: name, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: name, url: file.uri, dialogTitle: "Save or share" });
    return;
  }
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}
