import type { Metadata } from "next";
import TrackerView from "../components/TrackerView";

export const metadata: Metadata = { title: "Tracker" };

export default function Page() {
  return <TrackerView />;
}
