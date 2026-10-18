"use client";
import { useEffect, useRef } from "react";
import { isNative } from "@/lib/http";
import { useApp } from "@/lib/store";

/**
 * Glue that only does anything inside the Android / iOS app:
 *   - the Android back button closes panels, then goes back, then exits
 *   - the status bar follows the theme
 *   - links to other sites open in the system browser (in-app Custom Tab / Safari view)
 */
export default function NativeBridge() {
  const { dark, selected, paletteOpen, helpOpen, closeJob, setPaletteOpen, setHelpOpen } = useApp();

  // Keep the latest UI state in a ref so the back-button listener is registered only once
  const ui = useRef({ selected, paletteOpen, helpOpen, closeJob, setPaletteOpen, setHelpOpen });
  useEffect(() => {
    ui.current = { selected, paletteOpen, helpOpen, closeJob, setPaletteOpen, setHelpOpen };
  });

  useEffect(() => {
    if (!isNative()) return;
    let remove: (() => void) | undefined;
    import("@capacitor/app").then(({ App }) => {
      App.addListener("backButton", () => {
        const u = ui.current;
        if (u.selected) u.closeJob();
        else if (u.paletteOpen) u.setPaletteOpen(false);
        else if (u.helpOpen) u.setHelpOpen(false);
        else if (location.hash.startsWith("#/") && location.hash !== "#/") history.back();
        else App.exitApp();
      }).then((h) => (remove = () => h.remove()));
    });

    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      const href = a?.getAttribute("href") ?? "";
      if (!/^https?:\/\//i.test(href)) return;
      try {
        if (new URL(href).origin === location.origin) return;
      } catch {
        return;
      }
      e.preventDefault();
      import("@capacitor/browser").then(({ Browser }) => Browser.open({ url: href }));
    };
    document.addEventListener("click", onClick, true);
    return () => {
      remove?.();
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    if (!isNative()) return;
    import("@capacitor/status-bar")
      .then(async ({ StatusBar, Style }) => {
        await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ color: dark ? "#090b0f" : "#f6f7fa" }).catch(() => {}); // Android only
      })
      .catch(() => {});
  }, [dark]);

  return null;
}
