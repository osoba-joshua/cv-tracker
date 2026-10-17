import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  applicationName: "CV Tracker",
  appleWebApp: { capable: true, title: "CV Tracker", statusBarStyle: "default" },
  title: "CV Tracker – find jobs that fit your CV",
  description: "Upload your CV, get live remote and local job postings ranked by fit, and track your applications.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

// Sets the theme before first paint so there is no light/dark flash.
const themeScript = `try{var t=localStorage.getItem("cvt:theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen">
        <a href="#main" className="sr-only fixed left-2 top-2 z-[100] rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg focus:not-sr-only">
          Skip to content
        </a>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
