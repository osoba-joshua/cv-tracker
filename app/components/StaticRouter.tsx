"use client";
import { useEffect, type ComponentType } from "react";
import { usePath } from "@/lib/nav";
import CvView from "./CvView";
import DiscoverView from "./DiscoverView";
import InsightsView from "./InsightsView";
import SettingsView from "./SettingsView";
import TrackerView from "./TrackerView";

const ROUTES: Record<string, { View: ComponentType; title: string }> = {
  "/": { View: DiscoverView, title: "CV Tracker: find jobs that fit your CV" },
  "/insights": { View: InsightsView, title: "Insights · CV Tracker" },
  "/tracker": { View: TrackerView, title: "Tracker · CV Tracker" },
  "/cv": { View: CvView, title: "My CV · CV Tracker" },
  "/settings": { View: SettingsView, title: "Settings · CV Tracker" },
};

/** Renders the right screen from the URL hash. Used only by the static / on-device build. */
export default function StaticRouter() {
  const path = usePath();
  const route = ROUTES[path] ?? ROUTES["/"];

  useEffect(() => {
    document.title = route.title;
    window.scrollTo(0, 0);
  }, [route]);

  const View = route.View;
  return <View />;
}
