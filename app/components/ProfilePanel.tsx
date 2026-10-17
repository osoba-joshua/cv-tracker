"use client";
import { useEffect, useState } from "react";
import { ALL_SKILLS } from "@/lib/skills";
import { LEVEL_NAMES, type Level, type Profile } from "@/lib/types";

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
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((s) => (
          <span key={s} className="chip chip-accent gap-1 !pr-1">
            {s}
            <button
              className="grid h-4 w-4 cursor-pointer place-items-center rounded-full hover:bg-accent/20"
              aria-label={`Remove ${s}`}
              onClick={() => onChange(items.filter((i) => i !== s))}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M2 2l6 6M8 2l-6 6" />
              </svg>
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
          className="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted"
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

export default function ProfilePanel({
  profile,
  onChange,
  loading,
}: {
  profile: Profile;
  onChange: (p: Profile) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    // Start collapsed on small screens so results are visible without scrolling.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.innerWidth < 1024) setOpen(false);
  }, []);
  return (
    <section className="card p-4" aria-label="Your profile">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Your profile</h2>
          <p className="text-xs text-muted">
            {profile.skills.length} skills · {profile.titles.length} roles
            {profile.years ? ` · ${profile.years}+ yrs` : ""}
            {loading && <span className="ml-2 text-accent">updating…</span>}
          </p>
        </div>
        <button className="btn btn-ghost !px-2 text-xs text-muted" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Hide" : "Edit"}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-4">
          <ChipInput
            label="Skills"
            items={profile.skills}
            onChange={(skills) => onChange({ ...profile, skills })}
            placeholder="Add a skill…"
            suggestions={ALL_SKILLS}
            listId="skill-list"
          />
          <ChipInput
            label="Roles you want"
            items={profile.titles}
            onChange={(titles) => onChange({ ...profile, titles })}
            placeholder="e.g. frontend developer"
            listId="title-list"
          />
          <div>
            <label className="label" htmlFor="level">
              Seniority
            </label>
            <select
              id="level"
              className="input"
              value={profile.level ?? ""}
              onChange={(e) => onChange({ ...profile, level: e.target.value === "" ? null : (Number(e.target.value) as Level) })}
            >
              <option value="">Any</option>
              {LEVEL_NAMES.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted">Changes re-rank jobs instantly. Your CV itself is never uploaded again or stored.</p>
        </div>
      )}
    </section>
  );
}
