import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-28 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Compass size={26} />
      </span>
      <p className="mt-5 text-sm font-semibold text-accent">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">That page doesn&apos;t exist</h1>
      <p className="mt-2 text-muted">The link may be old or mistyped. Let&apos;s get you back to your jobs.</p>
      <Link href="/" className="btn btn-primary btn-lg mt-6">
        Back to Discover
      </Link>
    </main>
  );
}
