"use client";
import { useState } from "react";

type Result = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  score: number;
  matched: string[];
  why?: string;
  source: string;
};
type Resp = {
  profile: { skills: string[]; titles: string[]; yearsExperience: number | null };
  total: number;
  results: Result[];
};

export default function Home() {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch("/api/match", { method: "POST", body: new FormData(form) });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "Failed");
      else setData(json);
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">CV Tracker</h1>
      <p className="mt-2 text-neutral-500">
        Upload your CV and we&apos;ll rank live job postings by how well they fit you.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-wrap items-center gap-3">
        <input type="file" name="cv" accept=".pdf,.txt,.md" required className="rounded border p-2" />
        <button
          disabled={loading}
          className="rounded bg-blue-600 px-5 py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? "Finding jobs…" : "Find jobs"}
        </button>
      </form>

      {error && <p className="mt-6 text-red-600">{error}</p>}

      {data && (
        <section className="mt-10">
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold">What we read from your CV</h2>
            <p className="mt-1 text-sm">Skills: {data.profile.skills.join(", ") || "none detected"}</p>
            <p className="text-sm">Roles: {data.profile.titles.join(", ") || "none detected"}</p>
          </div>
          <p className="mt-6 text-sm text-neutral-500">
            Scanned {data.total} postings, showing top {data.results.length}.
          </p>
          <ul className="mt-3 space-y-3">
            {data.results.map((j) => (
              <li key={j.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <a
                      href={j.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {j.title}
                    </a>
                    <p className="text-sm">
                      {j.company} · {j.location} · <span className="text-neutral-500">{j.source}</span>
                    </p>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                    {j.score}%
                  </span>
                </div>
                {j.why && <p className="mt-2 text-sm">{j.why}</p>}
                {j.matched.length > 0 && (
                  <p className="mt-2 text-xs text-neutral-500">Matched: {j.matched.join(", ")}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
