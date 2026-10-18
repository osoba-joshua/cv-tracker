"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-md px-4 py-28 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-bad-soft text-bad">
        <AlertTriangle size={26} />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-muted">An unexpected error happened. Your CV and tracker are safe in this browser. Try again, or head back home.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button className="btn btn-primary btn-lg" onClick={() => retry()}>
          <RotateCcw size={16} /> Try again
        </button>
        <Link href="/" className="btn btn-lg">
          Go home
        </Link>
      </div>
    </main>
  );
}
