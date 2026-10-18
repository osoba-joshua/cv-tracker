// Builds the serverless version of the app into ./out (static files).
//
// Next.js can't export a project that contains API routes, and the static build doesn't need them (the on-device
// engine runs the same logic in the browser). So for the duration of the build this script:
//   - moves app/api aside (a folder starting with "_" is private to Next and never routed) and the other routes
//     too (the static build is a single page that routes by URL hash, see lib/nav.tsx),
//   - replaces the dynamic manifest and robots routes with plain files in public/,
// and then puts everything back, even if the build fails.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const STASH = "scripts/.stash";
const moves = [
  ["app/api", "app/_api"],
  ["app/insights", `${STASH}/insights`],
  ["app/tracker", `${STASH}/tracker`],
  ["app/cv", `${STASH}/cv`],
  ["app/settings", `${STASH}/settings`],
  ["app/manifest.ts", `${STASH}/manifest.ts`],
  ["app/robots.ts", `${STASH}/robots.ts`],
];
const generated = ["public/manifest.webmanifest", "public/robots.txt"];

if (existsSync("app/_api") || existsSync(STASH)) {
  console.error("A previous static build was interrupted. Move app/_api back to app/api and scripts/.stash/* back into app/ first.");
  process.exit(1);
}

const manifest = {
  name: "CV Tracker",
  short_name: "CV Tracker",
  description: "Upload your CV, find jobs that fit, and track your applications.",
  start_url: `${base}/`,
  scope: `${base}/`,
  display: "standalone",
  background_color: "#090b0f",
  theme_color: "#7c5cff",
  categories: ["productivity", "business"],
  icons: [
    { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
    { src: `${base}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    { src: `${base}/icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
  ],
};

let status = 1;
const done = [];
try {
  mkdirSync(STASH, { recursive: true });
  for (const [from, to] of moves) {
    renameSync(from, to);
    done.push([from, to]);
  }
  writeFileSync("public/manifest.webmanifest", JSON.stringify(manifest, null, 2));
  writeFileSync("public/robots.txt", "User-agent: *\nAllow: /\n");

  rmSync("out", { recursive: true, force: true });
  rmSync(".next", { recursive: true, force: true }); // stale generated types would still point at app/api
  const r = spawnSync("npx", ["next", "build"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, NEXT_PUBLIC_ENGINE: "local" },
  });
  status = r.status ?? 1;
} finally {
  for (const [from, to] of done.reverse()) renameSync(to, from);
  for (const f of generated) rmSync(f, { force: true });
  rmSync(STASH, { recursive: true, force: true });
}
process.exit(status);
