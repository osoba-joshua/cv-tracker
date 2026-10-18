import type { NextConfig } from "next";

// Two ways to build this app:
//   server build (default): normal Next.js server with the /api routes.
//   static build (NEXT_PUBLIC_ENGINE=local): plain files with no server. The app runs its logic in the browser,
//   so it can be hosted anywhere (GitHub Pages) or wrapped as an Android/iOS app. See scripts/build-static.mjs.
const isStatic = process.env.NEXT_PUBLIC_ENGINE === "local";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ""; // e.g. "/cv-tracker" on GitHub Pages

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app needs none of these browser features
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  ...(isStatic
    ? {
        output: "export",
        trailingSlash: true, // /insights/ -> insights/index.html, which static hosts and the Capacitor WebView can serve
        images: { unoptimized: true },
        basePath,
        assetPrefix: basePath || undefined,
      }
    : {
        ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}), // used by the Dockerfile
        cacheComponents: true,
        partialPrefetching: true,
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
