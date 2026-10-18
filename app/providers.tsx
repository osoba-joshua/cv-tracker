"use client";
import type { ReactNode } from "react";
import { AppProvider } from "@/lib/store";
import Shell from "./components/Shell";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <Shell>{children}</Shell>
    </AppProvider>
  );
}
