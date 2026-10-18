import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { SETTINGS_BOOT_SCRIPT } from "@/lib/settings";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Set NEXT_PUBLIC_SITE_URL when you deploy so share images get absolute URLs.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
// The static build has no dynamic manifest route; it ships a plain file instead (see scripts/build-static.mjs).
const isStatic = process.env.NEXT_PUBLIC_ENGINE === "local";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "CV Tracker",
  ...(isStatic ? { manifest: `${basePath}/manifest.webmanifest` } : {}),
  appleWebApp: { capable: true, title: "CV Tracker", statusBarStyle: "default" },
  title: { default: "CV Tracker: find jobs that fit your CV", template: "%s · CV Tracker" },
  description: "Upload your CV, get live remote and local job postings ranked by fit, see your skill gaps, and track your applications. Free and private.",
  openGraph: {
    title: "CV Tracker: find jobs that fit your CV",
    description: "Live jobs ranked by how well they match your CV, filtered to where you live. Free, private, no account.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the native apps draw under the notch; paddings use env(safe-area-inset-*)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#090b0f" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only fixed left-2 top-2 z-[100] rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg focus:not-sr-only"
        >
          Skip to content
        </a>
        <Script id="settings-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: SETTINGS_BOOT_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
