"use client";
import { useRef, type ReactNode } from "react";
import { Bot, Check, Database, Download, ExternalLink, Globe, Keyboard, Monitor, Moon, Palette, RotateCcw, Settings as Cog, ShieldCheck, Sun, Trash2, Upload } from "lucide-react";
import { clearAllData, downloadFile, exportBackup, importBackup } from "@/lib/backup";
import { ACCENTS, type Accent, type DarkStyle, type Density, type ThemePref } from "@/lib/settings";
import { useApp } from "@/lib/store";
import { GithubMark } from "./Logo";
import { Toggle } from "./Filters";
import LocationPanel from "./LocationPanel";

const REPO = "https://github.com/osoba-joshua/cv-tracker";

function Section({ icon: Icon, title, sub, children }: { icon: typeof Cog; title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Icon size={17} /></span>
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; icon?: typeof Sun }[]; label: string }) {
  return (
    <div className="inline-flex rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label={label}>
      {options.map(({ id, label: l, icon: Icon }) => (
        <button
          key={id}
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-all ${value === id ? "bg-card text-fg shadow-sm" : "text-muted hover:text-fg"}`}
        >
          {Icon && <Icon size={14} />} {l}
        </button>
      ))}
    </div>
  );
}

export default function SettingsView() {
  const { ready, settings, setSettings, ai, data, trackedList, searches, hiddenIds, restoreHidden, cvText, setHelpOpen, toast } = useApp();
  const file = useRef<HTMLInputElement>(null);
  if (!ready) return <div className="mx-auto max-w-3xl px-4 py-8"><div className="skeleton h-64 rounded-2xl" /></div>;

  const onImport = async (f: File) => {
    try {
      const n = importBackup(await f.text());
      toast(`Restored ${n} items. Reloading…`, { tone: "success" });
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't import that file", { tone: "error" });
    }
  };

  const local = data?.localSources;

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:py-8">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-3xl"><Cog className="text-accent" size={26} /> Settings</h1>
        <p className="mt-1 text-sm text-muted">Everything is saved in this browser.</p>
      </div>

      <Section icon={Palette} title="Appearance" sub="Make it yours.">
        <div className="space-y-5">
          <div>
            <p className="label">Theme</p>
            <Segmented<ThemePref> label="Theme" value={settings.theme} onChange={(theme) => setSettings({ ...settings, theme })} options={[{ id: "system", label: "System", icon: Monitor }, { id: "light", label: "Light", icon: Sun }, { id: "dark", label: "Dark", icon: Moon }]} />
          </div>
          <div>
            <p className="label">Dark style</p>
            <Segmented<DarkStyle> label="Dark style" value={settings.variant ?? "default"} onChange={(variant) => setSettings({ ...settings, variant })} options={[{ id: "default", label: "Standard" }, { id: "midnight", label: "Midnight" }]} />
            <p className="mt-2 text-xs text-muted">Midnight is pure black. It looks striking and saves battery on OLED screens. Applies in dark theme.</p>
          </div>
          <div>
            <p className="label">Accent colour</p>
            <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Accent colour">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  role="radio"
                  aria-checked={settings.accent === a.id}
                  aria-label={a.label}
                  title={a.label}
                  onClick={() => setSettings({ ...settings, accent: a.id as Accent })}
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-full ring-offset-2 ring-offset-card transition-transform hover:scale-110"
                  style={{ background: a.swatch, boxShadow: settings.accent === a.id ? `0 0 0 2px var(--card), 0 0 0 4px ${a.swatch}` : undefined }}
                >
                  {settings.accent === a.id && <Check size={16} color="#fff" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label">Density</p>
            <Segmented<Density> label="Density" value={settings.density} onChange={(density) => setSettings({ ...settings, density })} options={[{ id: "comfortable", label: "Comfortable" }, { id: "compact", label: "Compact" }]} />
            <p className="mt-2 text-xs text-muted">Compact shows more jobs per screen by hiding skill chips on cards.</p>
          </div>
          <div>
            <p className="label">Effects</p>
            <Toggle checked={settings.effects !== false} onChange={(effects) => setSettings({ ...settings, effects })}>
              Interactive effects <span className="text-xs text-muted">(moving background, glow, hover lighting)</span>
            </Toggle>
          </div>
        </div>
      </Section>

      <LocationPanel />

      <Section icon={Bot} title="AI copilot" sub="Optional and free. Powers fit checks, cover letters, interview prep and CV reviews.">
        {ai.enabled ? (
          <div className="space-y-3 text-sm">
            <p className="flex flex-wrap items-center gap-2"><span className="chip chip-good">Connected</span> {ai.providers.map((p) => <span key={p} className="chip">{p}</span>)}</p>
            <p className="text-muted">Your CV text and the job text are sent to these providers only when you press a button or upload a CV. Nothing is stored on a server. If one is busy, the next one is tried.</p>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-muted">AI is off. Turn it on for free in about two minutes. Pick one, paste the key into your <code className="rounded bg-surface-2 px-1">.env</code> file, and restart the app:</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                ["Google Gemini", "https://aistudio.google.com/apikey", "GEMINI_API_KEY"],
                ["Groq", "https://console.groq.com/keys", "GROQ_API_KEY"],
                ["OpenRouter", "https://openrouter.ai/keys", "OPENROUTER_API_KEY"],
                ["Ollama (local, private)", "https://ollama.com", "OLLAMA_MODEL"],
              ].map(([n, href, key]) => (
                <li key={n}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className="card card-hover flex items-center justify-between gap-2 px-3.5 py-3">
                    <span><span className="block font-medium">{n}</span><code className="text-xs text-muted">{key}</code></span>
                    <ExternalLink size={15} className="text-muted" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section icon={Globe} title="Job sources" sub="Where listings come from. Every job links to its original posting.">
        <div className="flex flex-wrap gap-2">
          {[["Remote OK", "https://remoteok.com"], ["Remotive", "https://remotive.com"], ["Himalayas", "https://himalayas.app"], ["Jobicy", "https://jobicy.com"], ["Working Nomads", "https://www.workingnomads.com"], ["Arbeitnow", "https://www.arbeitnow.com"]].map(([n, h]) => (
            <a key={n} href={h} target="_blank" rel="noopener" className="chip hover:bg-surface-2">{n} <ExternalLink size={11} /></a>
          ))}
          <span className={`chip ${local?.jooble ? "chip-good" : ""}`}>Jooble {local?.jooble ? "on" : "off"}</span>
          <span className={`chip ${local?.adzuna ? "chip-good" : ""}`}>Adzuna {local?.adzuna ? "on" : "off"}</span>
        </div>
        <p className="mt-3 text-xs text-muted">Jooble and Adzuna add local on-site jobs. Add free keys in .env to turn them on.</p>
      </Section>

      <Section icon={Database} title="Your data" sub="No account, no server. Back up or wipe it any time.">
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Tracked jobs", trackedList.length], ["Saved searches", searches.length], ["Hidden jobs", hiddenIds.length], ["CV stored", cvText ? "Yes" : "No"]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-surface-2 px-3 py-2.5">
              <p className="text-lg font-semibold tabular-nums">{v}</p>
              <p className="text-xs text-muted">{l}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => downloadFile(`cv-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`, exportBackup())}><Download size={15} /> Export backup</button>
          <button className="btn" onClick={() => file.current?.click()}><Upload size={15} /> Import backup</button>
          <input ref={file} type="file" accept="application/json,.json" className="sr-only" aria-label="Import backup file" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
          {hiddenIds.length > 0 && <button className="btn" onClick={restoreHidden}><RotateCcw size={15} /> Restore hidden jobs</button>}
          <button
            className="btn text-bad"
            onClick={() => {
              if (confirm("Delete your CV, profile, tracker and settings from this browser? This cannot be undone. (Tip: export a backup first.)")) {
                clearAllData();
                location.reload();
              }
            }}
          >
            <Trash2 size={15} /> Delete everything
          </button>
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs text-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-good" /> Backups contain your CV text and tracker. Keep the file somewhere safe.</p>
      </Section>

      <Section icon={Keyboard} title="Shortcuts & about">
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" onClick={() => setHelpOpen(true)}><Keyboard size={15} /> Keyboard shortcuts</button>
          <a className="btn" href={REPO} target="_blank" rel="noopener noreferrer"><GithubMark size={15} /> Source on GitHub</a>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">CV Tracker is open source (MIT). Press <kbd className="kbd">Ctrl</kbd> <kbd className="kbd">K</kbd> anywhere to open the command palette.</p>
      </Section>
    </main>
  );
}
