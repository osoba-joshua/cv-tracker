import DiscoverView from "./components/DiscoverView";
import StaticRouter from "./components/StaticRouter";
import { ENGINE_MODE } from "@/lib/engine";

// Server build: this page is Discover (the other screens are their own routes).
// Static / on-device build: this is the only page, and it shows the right screen from the URL hash.
export default function Page() {
  return ENGINE_MODE === "local" ? <StaticRouter /> : <DiscoverView />;
}
