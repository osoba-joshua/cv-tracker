"use client";
// Navigation that works in both builds:
//   server build: normal Next.js routes (/insights, /tracker, ...)
//   static build (GitHub Pages, Android, iOS): hash routes (#/insights, #/tracker, ...)
// Hash routing needs no cooperation from the host, so reloads, deep links and the native WebViews all just work.
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { ENGINE_MODE } from "./engine";

const routeFromHash = () => {
  const h = window.location.hash;
  if (!h.startsWith("#/")) return null; // plain anchors like #features or #main are not routes
  return h.slice(1).split("?")[0].replace(/\/+$/, "") || "/";
};

let lastHashPath = "/";
const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const snapshot = () => {
  const p = routeFromHash();
  if (p) lastHashPath = p;
  return lastHashPath;
};
const serverSnapshot = () => "/";

function useHashPath() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
function useHashNavigate() {
  return useCallback((href: string) => {
    window.location.hash = href;
  }, []);
}
function useServerNavigate() {
  const router = useRouter();
  return useCallback((href: string) => router.push(href), [router]);
}

/** The current route, e.g. "/insights". */
export const usePath: () => string = ENGINE_MODE === "local" ? useHashPath : usePathname;
/** Go to a route, e.g. navigate("/tracker"). */
export const useNavigate: () => (href: string) => void = ENGINE_MODE === "local" ? useHashNavigate : useServerNavigate;

type LinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
  "aria-label"?: string;
  "aria-current"?: "page" | undefined;
};

export function AppLink({ href, prefetch, children, ...rest }: LinkProps) {
  if (ENGINE_MODE === "local") {
    return (
      <a href={`#${href}`} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <NextLink href={href} prefetch={prefetch} {...rest}>
      {children}
    </NextLink>
  );
}
