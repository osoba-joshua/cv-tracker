"use client";
import { useEffect, useState } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { ALL_SKILLS } from "@/lib/skills";
import { useApp } from "@/lib/store";
import { LEVEL_NAMES, type Level } from "@/lib/types";

function ChipInput({
  label,
  items,
  onChange,
  placeholder,
  suggestions,
  listId,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  suggestions?: string[];
  listId: string;
}) {
  const [v, setV] = useState("");
  const add = () => {
    const t = v.trim();
    if (t && !items.some((i) => i.toLowerCase() === t.toLowerCase())) onChange([...items, t]);
    setV("");
  };
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-card p-1.5 focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--accent-ring)]">
        {items.map((s) => (
          <span key={s} className="chip chip-accent gap-1 !pr-1">
            {s}
            <button
              className="grid h-4 w-4 cursor-pointer place-items-center rounded-full hover:bg-accent/20"
              aria-label={`Remove ${s}`}
              onClick={() => onChange(items.filter((i) => i !== s))}
            >
              <X size={10} strokeWidth={3} />
            </button>
          </span>
        ))}
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !v && items.length) onChange(items.slice(0, -1));
          }}
          onBlur={add}
          list={listId}
          placeholder={placeholder}
          aria-label={`Add ${label.toLowerCase()}`}
          className="min-w-28 flex-1 bg-transparent px-1.5 py-1 text-sm outline-none placeholder:text-muted"
        />
        {suggestions && (
          <datalist id={listId}>
            {suggestions.filter((s) => !items.includes(s)).map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        )}
      </div>
    </div>
  );
}

/** Editable summary of what we read from the CV. Changes re-rank jobs instantly. */
export default function ProfilePanel({ defaultOpen = true, idSuffix = "" }: { defaultOpen?: boolean; idSuffix?: string }) {
  const { profile, setProfile, searching, data, ai, aiReading, aiRead, cvText } = useApp();
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    // Start collapsed on small screens so results are visible without scrolling.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (defaultOpen && window.innerWidth < 1024) setOpen(false);
  }, [defaultOpen]);
  if (!profile) return null;
  const update = (p: Partial<typeof profile>) => setProfile({ ...profile, ...p });

  return (
    <section className="card p-4" aria-label="Your profile">
      <button className="flex w-full cursor-pointer items-center justify-between gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div>
          <h2 className="font-semibold">Your profile</h2>
          <p className="text-xs text-muted">
            {profile.skills.length} skills · {profile.titles.length} roles
            {profile.years ? ` · ${profile.years}+ yrs` : ""}
            {searching && !!data && <span className="ml-2 text-accent">updating…</span>}
          </p>
        </div>
        <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {profile.summary && (
        <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-xs leading-relaxed">
          <span className="font-semibold text-accent">AI read: </span>
          {profile.summary}
        </p>
      )}
      {open && (
        <div className="mt-4 space-y-4">
          <ChipInput label="Skills" items={profile.skills} onChange={(skills) => update({ skills })} placeholder="Add a skill…" suggestions={ALL_SKILLS} listId={`skill-list${idSuffix}`} />
          <ChipInput label="Roles you want" items={profile.titles} onChange={(titles) => update({ titles })} placeholder="e.g. frontend developer" listId={`title-list${idSuffix}`} />
          <div>
            <label className="label" htmlFor={`level${idSuffix}`}>
              Seniority
            </label>
            <select
              id={`level${idSuffix}`}
              className="input"
              value={profile.level ?? ""}
              onChange={(e) => update({ level: e.target.value === "" ? null : (Number(e.target.value) as Level) })}
            >
              <option value="">Any</option>
              {LEVEL_NAMES.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          {ai.enabled && !!cvText && (
            <button className="btn w-full" disabled={aiReading} onClick={aiRead}>
              <Sparkles size={15} />
              {aiReading ? "AI is reading your CV…" : profile.summary ? "Re-read CV with AI" : "Improve with AI"}
            </button>
          )}
          <p className="text-xs text-muted">Changes re-rank jobs instantly. Your CV is never uploaded again or stored on a server.</p>
        </div>
      )}
    </section>
  );
}
