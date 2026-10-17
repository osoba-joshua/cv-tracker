import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CV Tracker",
    short_name: "CV Tracker",
    description: "Upload your CV, find jobs that fit, and track your applications.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d12",
    theme_color: "#4f46e5",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
