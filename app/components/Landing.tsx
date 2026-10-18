"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BarChart3, Bot, ChevronDown, Columns3, Globe, Lock, MapPin, Moon, ShieldCheck, Sparkles, Sun, Target, Zap } from "lucide-react";
import { useApp } from "@/lib/store";
import Dropzone from "./Dropzone";
import InteractiveBackground from "./InteractiveBackground";
import LiveDemo from "./LiveDemo";
import Tilt from "./Tilt";
import { CountrySelect } from "./LocationPanel";
import Logo, { GithubMark } from "./Logo";
import Reveal from "./Reveal";
import ScoreRing from "./ScoreRing";

const REPO = "https://github.com/osoba-joshua/cv-tracker";
const SOURCES = ["Remote OK", "Remotive", "Himalayas", "Jobicy", "Working Nomads", "Arbeitnow"];

function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!to) return;
    const el = ref.current;
    if (!el) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const run = () => {
      if (reduce) return setN(to);
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min((t - t0) / 1100, 1);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        run();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref} className="tabular-nums">
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}

const FEATURES = [
  { icon: Target, title: "Ranked by real fit", body: "Every job gets a 0-100 score from skills, role, seniority and location. See exactly what matched and why." },
  { icon: MapPin, title: "Built for where you live", body: "Jobs in your country plus remote roles that actually accept applicants from there. One switch shows the rest of the world." },
  { icon: BarChart3, title: "Skill-gap insights", body: "See which skills would unlock the most jobs, salary ranges, top hiring companies and what's trending for your profile." },
  { icon: Columns3, title: "Application tracker", body: "Save jobs and move them from Saved to Offer. Notes, follow-up reminders, history and one-click CSV export." },
  { icon: Bot, title: "Free AI copilot", body: "Cover letters, interview prep, CV tailoring and a fit check, powered by free Gemini, Groq or your own Ollama." },
  { icon: ShieldCheck, title: "Private by design", body: "No account and no server-side storage. Your CV and tracker stay in your browser unless you export them." },
];

const FAQ: [string, string][] = [
  ["Is it really free?", "Yes. There's no account, no paywall and no trial. The job feeds are free public APIs, and the optional AI features use the free tiers of Gemini, Groq or a local Ollama install, so there's nothing to pay for."],
  ["What happens to my CV?", "It's read in memory and kept only in your own browser. If you switch on AI, the CV text is sent to the AI provider you configured when you press a button, and nowhere else. Nothing is stored on a server."],
  ["Where do the jobs come from?", "Remote OK, Remotive, Himalayas, Jobicy, Working Nomads and Arbeitnow, plus Jooble and Adzuna if you add free keys. Every job links back to its original posting, and feeds are refreshed hourly."],
  ["Why are there fewer jobs in my country?", "Free job APIs are mostly remote-first. The app shows remote jobs open to your country by default. Adding a free Jooble or Adzuna key brings in local on-site listings."],
  ["How is the match score calculated?", "Skill coverage (weighted higher when a skill is in the job title), how many core skills you have, how well your target roles fit the title, and a seniority check. Jobs in your own country get a small bonus. Open any job to see the breakdown."],
  ["Can I use it on my phone?", "Yes. It's fully responsive with a native-style tab bar, and it can be installed to your home screen like an app."],
];

export default function Landing() {
  const { parsing, parseError, onFile, onText, loadSample, loc, setLoc, ai, setSettings, dark } = useApp();
  const [stats, setStats] = useState<{ jobs: number; sources: number; countries: number } | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats({ jobs: 0, sources: 6, countries: 85 }));
  }, []);

  const toUpload = () => document.getElementById("upload")?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="relative overflow-x-clip">
      {/* ---------- nav ---------- */}
      <header className="glass sticky top-0 z-40 border-b border-line/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Logo />
          <nav className="ml-6 hidden items-center gap-6 text-sm text-muted md:flex" aria-label="Sections">
            <a href="#features" className="hover:text-fg">Features</a>
            <a href="#how" className="hover:text-fg">How it works</a>
            <a href="#privacy" className="hover:text-fg">Privacy</a>
            <a href="#faq" className="hover:text-fg">FAQ</a>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <a href={REPO} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon" aria-label="View source on GitHub">
              <GithubMark />
            </a>
            <button className="btn btn-ghost btn-icon" onClick={() => setSettings((s) => ({ ...s, theme: dark ? "light" : "dark" }))} aria-label={`Switch to ${dark ? "light" : "dark"} theme`}>
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn btn-primary hidden sm:inline-flex" onClick={toUpload}>
              Upload CV
            </button>
          </div>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className="relative isolate">
        <div className="aurora" />
        <InteractiveBackground />
        <div className="grid-bg absolute inset-x-0 top-0 -z-10 h-[34rem]" />
        <div className="mx-auto max-w-4xl px-4 pb-14 pt-14 text-center sm:pt-24">
          <span className="reveal reveal-1 chip chip-accent !py-1 !pl-2">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-good" /> Free forever · No account · Private by design
          </span>
          <h1 className="reveal reveal-2 mx-auto mt-6 max-w-3xl text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Your next job, matched to your CV <span className="gradient-text">in seconds</span>
          </h1>
          <p className="reveal reveal-3 mx-auto mt-5 max-w-xl text-lg text-muted">
            Drop in your CV. We scan live job boards, rank every posting by how well you fit, and show the exact skills standing between you and the roles you want.
          </p>

          <div id="upload" className="reveal reveal-4 mx-auto mt-10 max-w-2xl scroll-mt-24 text-left">
            <div className="card beam p-3 sm:p-4" style={{ boxShadow: "var(--shadow-lg)" }}>
              <div className="mb-3 flex items-center gap-3 px-1">
                <label htmlFor="home" className="flex shrink-0 items-center gap-1.5 text-sm font-medium">
                  <MapPin size={15} className="text-accent" /> I&apos;m based in
                </label>
                <div className="min-w-0 flex-1">
                  <CountrySelect id="home" value={loc.country} onChange={(country) => setLoc({ ...loc, country, manual: true })} />
                </div>
              </div>
              <Dropzone busy={parsing} error={parseError} onFile={onFile} onText={onText} onSample={loadSample} />
              {ai.enabled && (
                <p className="mt-3 px-1 text-center text-xs text-muted">
                  AI is on: your CV text goes to the AI provider you configured to power the job tools. Nothing is stored on a server.
                </p>
              )}
            </div>
          </div>

          <p className="mt-8 text-xs font-medium uppercase tracking-wider text-muted">Live jobs from</p>
          <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-fg-2/80">
            {SOURCES.map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <Globe size={13} className="text-muted" /> {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- product preview ---------- */}
      <section className="mx-auto max-w-5xl px-4 pb-20" aria-label="Product preview">
        <Reveal>
          <Tilt>
          <div className="card overflow-hidden !rounded-3xl" style={{ boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center gap-1.5 border-b border-line bg-surface-2 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-good/70" />
              <span className="ml-3 rounded-md bg-card px-3 py-0.5 text-xs text-muted">cv-tracker · Discover</span>
              <span className="ml-auto text-[11px] text-muted">Preview with sample data</span>
            </div>
            <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[1.4fr_1fr]">
              <div className="space-y-3">
                {[
                  { t: "Senior Frontend Engineer", c: "Northwind Labs", l: "Worldwide", s: 92, sal: "$120k – $150k", m: ["React", "TypeScript", "Next.js"], g: ["GraphQL"] },
                  { t: "Product Designer, Growth", c: "Lumen Health", l: "Remote · Africa", s: 84, sal: "$90k – $115k", m: ["Figma", "Prototyping", "UX"], g: ["Research"] },
                  { t: "Full-Stack Developer", c: "Orbit Studio", l: "Lagos, Nigeria", s: 71, sal: "", m: ["Node.js", "SQL", "React"], g: ["AWS", "Docker"] },
                ].map((j) => (
                  <div key={j.t} className="rounded-2xl border border-line bg-card p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-sm font-bold text-accent">{j.c[0]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug">{j.t}</p>
                        <p className="text-sm text-muted">{j.c} · {j.l}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {j.sal && <span className="chip chip-good">{j.sal}</span>}
                          {j.m.map((m) => (
                            <span key={m} className="chip chip-good">✓ {m}</span>
                          ))}
                          {j.g.map((m) => (
                            <span key={m} className="chip chip-warn">{m}</span>
                          ))}
                        </div>
                      </div>
                      <ScoreRing score={j.s} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden space-y-4 rounded-2xl border border-line bg-surface-2/60 p-5 md:block">
                <div>
                  <p className="label">Skills that unlock more jobs</p>
                  {[["GraphQL", 78], ["Docker", 61], ["AWS", 47], ["Testing", 32]].map(([k, v]) => (
                    <div key={k} className="mb-2.5">
                      <div className="mb-1 flex justify-between text-xs"><span className="font-medium">{k}</span><span className="text-muted">+{Math.round(Number(v) / 6)} jobs</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-line bg-card p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-accent"><Sparkles size={13} /> AI fit check</p>
                  <p className="mt-1 text-sm text-fg-2">Strong fit. Your design-system work maps directly to their needs; add a GraphQL project to close the main gap.</p>
                </div>
              </div>
            </div>
          </div>
          </Tilt>
        </Reveal>
      </section>

      {/* ---------- live demo ---------- */}
      <LiveDemo />

      {/* ---------- stats ---------- */}
      <section className="border-y border-line bg-card/50">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 text-center sm:grid-cols-4">
          {[
            { v: stats?.jobs ?? 0, s: "+", l: "live jobs scanned right now" },
            { v: stats?.sources ?? 6, s: "", l: "job boards combined" },
            { v: stats?.countries ?? 85, s: "", l: "countries supported" },
            { v: 0, s: "", l: "dollars, ever", raw: "$0" },
          ].map((x) => (
            <div key={x.l}>
              <p className="text-3xl font-semibold tracking-tight sm:text-4xl">{x.raw ?? <CountUp to={x.v} suffix={x.s} />}</p>
              <p className="mt-1 text-sm text-muted">{x.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- features ---------- */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-accent">Everything in one place</p>
          <h2 className="section-title mt-2">A job search that works as hard as you do</h2>
          <p className="mt-3 text-muted">Find, understand, apply and follow up, without juggling ten tabs and a spreadsheet.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={(i % 3) * 80}>
              <div className="card card-hover h-full p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><Icon size={20} /></span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section id="how" className="scroll-mt-20 border-y border-line bg-card/50 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-accent">How it works</p>
            <h2 className="section-title mt-2">From CV to shortlist in three steps</h2>
          </Reveal>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { I: Zap, t: "Drop in your CV", d: "We read your skills, roles and seniority in a blink. Fix anything we got wrong with one click." },
              { I: Globe, t: "We scan live boards", d: "Six job boards, refreshed hourly, filtered to roles you can take from your country." },
              { I: Target, t: "Act on the best fits", d: "Open a job, see why it matches, generate a cover letter, and track it to an offer." },
            ].map(({ I, t, d }, i) => (
              <Reveal key={t} delay={i * 100}>
                <li className="list-none">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-fg" style={{ boxShadow: "0 8px 20px -6px var(--accent-ring)" }}><I size={22} /></span>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">Step {i + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold">{t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- privacy ---------- */}
      <section id="privacy" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-20">
        <Reveal>
          <div className="card grid items-center gap-8 overflow-hidden p-8 md:grid-cols-[1fr_auto] md:p-12">
            <div>
              <span className="chip chip-accent"><Lock size={12} /> Your data stays yours</span>
              <h2 className="section-title mt-4">Private by design, not by promise</h2>
              <p className="mt-3 max-w-xl text-muted">
                There is no account to create and no database behind this app. Your CV, your profile and your tracker live in your browser. You can export a backup or wipe everything with one click. It&apos;s also fully open source, so you can read exactly what it does, or run it yourself.
              </p>
              <a href={REPO} target="_blank" rel="noopener noreferrer" className="btn mt-6 inline-flex"><GithubMark size={16} /> Read the source</a>
            </div>
            <ul className="space-y-3 text-sm">
              {["No sign-up or tracking cookies", "CV processed in memory, never stored", "Export or delete your data any time", "Open source under the MIT license"].map((t) => (
                <li key={t} className="flex items-center gap-2.5"><ShieldCheck size={17} className="shrink-0 text-good" /> {t}</li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-20">
        <Reveal className="text-center">
          <h2 className="section-title">Questions, answered</h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}
                <ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl p-10 text-center text-accent-fg sm:p-14" style={{ background: "linear-gradient(135deg, var(--accent), hsl(calc(var(--hue) + 50) 80% 52%))" }}>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Find your fit in the next 30 seconds</h2>
            <p className="mx-auto mt-3 max-w-md opacity-90">No account. No cost. Just your CV and a better shortlist.</p>
            <button onClick={toUpload} className="btn btn-lg mt-7 !border-transparent !bg-white !text-[#14161f]">
              Upload your CV <ArrowRight size={18} />
            </button>
          </div>
        </Reveal>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <Logo size={22} />
          <p className="max-w-xl text-xs leading-relaxed">
            Job listings come from Remote OK, Remotive, Himalayas, Jobicy, Working Nomads and Arbeitnow (and Jooble / Adzuna when configured). Every job links to its original posting. Open source under the MIT license.
          </p>
          <a href={REPO} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-fg"><GithubMark size={16} /> GitHub</a>
        </div>
      </footer>
    </div>
  );
}
