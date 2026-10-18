import type { CapacitorConfig } from "@capacitor/cli";

// The Android and iOS apps are the static build (npm run build:static -> ./out) running in a native WebView.
// Everything, including job search and CV reading, runs on the phone: no server, no account.
const config: CapacitorConfig = {
  appId: "app.cvtracker.mobile",
  appName: "CV Tracker",
  webDir: "out",
  backgroundColor: "#090b0f",
  server: { androidScheme: "https" },
  ios: { contentInset: "never", backgroundColor: "#090b0f" },
  android: { backgroundColor: "#090b0f", allowMixedContent: false },
  plugins: {
    SplashScreen: { launchAutoHide: true, launchShowDuration: 600, backgroundColor: "#090b0f", showSpinner: false },
  },
};

export default config;
