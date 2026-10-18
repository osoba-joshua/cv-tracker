// Generates the Android and iOS app icons and splash screens from the CV Tracker mark.
// Safe to run repeatedly: it only overwrites files the Capacitor templates created, and skips a platform that
// hasn't been added yet. Run after `npx cap add android|ios` (the CI workflows do this).
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const BG = "#090b0f";
const ACCENT_A = "#7c5cff";
const ACCENT_B = "#d946ef";

const gradient = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${ACCENT_A}"/><stop offset="1" stop-color="${ACCENT_B}"/></linearGradient></defs>`;
/** The check mark, scaled around the centre (scale < 1 keeps it inside Android's adaptive-icon safe zone). */
const check = (s, scale = 1, stroke = "#fff") => {
  const p = (x, y) => `${s * (0.5 + (x - 0.5) * scale)} ${s * (0.5 + (y - 0.5) * scale)}`;
  return `<path d="M${p(0.28, 0.52)} L${p(0.43, 0.67)} L${p(0.73, 0.35)}" fill="none" stroke="${stroke}" stroke-width="${s * 0.1 * scale}" stroke-linecap="round" stroke-linejoin="round"/>`;
};
const png = (svg) => sharp(Buffer.from(svg)).png();

const icon = (s, shape) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${gradient}` +
  (shape === "circle" ? `<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}" fill="url(#g)"/>` : `<rect width="${s}" height="${s}" rx="${shape === "square" ? 0 : s * 0.22}" fill="url(#g)"/>`) +
  check(s) +
  `</svg>`;

const foreground = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${check(s, 0.62)}</svg>`;

const splash = (w, h) => {
  const size = Math.round(Math.min(w, h) * 0.22);
  const x = Math.round((w - size) / 2);
  const y = Math.round((h - size) / 2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${gradient}<rect width="${w}" height="${h}" fill="${BG}"/>` +
    `<g transform="translate(${x} ${y})"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#g)"/>${check(size)}</g></svg>`
  );
};

const walk = (dir, out = []) => {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

let count = 0;
const write = async (file, builder) => {
  await builder.toFile(file);
  count++;
};

// ---------------- Android ----------------
const res = "android/app/src/main/res";
if (existsSync(res)) {
  const launcher = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  const adaptive = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  for (const [d, s] of Object.entries(launcher)) {
    await write(`${res}/mipmap-${d}/ic_launcher.png`, png(icon(s, "rounded")));
    await write(`${res}/mipmap-${d}/ic_launcher_round.png`, png(icon(s, "circle")));
    await write(`${res}/mipmap-${d}/ic_launcher_foreground.png`, png(foreground(adaptive[d])));
  }
  writeFileSync(`${res}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${ACCENT_A}</color>\n</resources>\n`);
  // Replace every splash image the template made, keeping each one's exact dimensions
  for (const f of walk(res).filter((p) => p.endsWith("splash.png"))) {
    const { width, height } = await sharp(f).metadata();
    await write(f, png(splash(width, height)));
  }
}

// ---------------- iOS ----------------
const assets = "ios/App/App/Assets.xcassets";
if (existsSync(assets)) {
  for (const f of walk(assets).filter((p) => /AppIcon.*\.png$/i.test(p))) {
    await write(f, png(icon(1024, "square"))); // iOS applies its own rounded corners
  }
  for (const f of walk(assets).filter((p) => /splash.*\.png$/i.test(p))) {
    const { width, height } = await sharp(f).metadata();
    await write(f, png(splash(width, height)));
  }
}

console.log(`Generated ${count} icon/splash images.`);
