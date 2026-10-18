import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""; // GitHub Pages serves the app below /cv-tracker

export default function manifest(): MetadataRoute.Manifest {
  return {
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
}
