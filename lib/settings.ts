export type ThemePref = "system" | "light" | "dark";
export type Accent = "indigo" | "blue" | "emerald" | "rose" | "amber" | "violet";
export type Density = "comfortable" | "compact";

export type DarkStyle = "default" | "midnight";

export type Settings = { theme: ThemePref; accent: Accent; density: Density; effects?: boolean; variant?: DarkStyle };

export const DEFAULT_SETTINGS: Settings = { theme: "system", accent: "indigo", density: "comfortable", effects: true };

export const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: "indigo", label: "Indigo", swatch: "hsl(258 78% 54%)" },
  { id: "blue", label: "Blue", swatch: "hsl(216 78% 48%)" },
  { id: "emerald", label: "Emerald", swatch: "hsl(158 78% 33%)" },
  { id: "rose", label: "Rose", swatch: "hsl(346 78% 50%)" },
  { id: "amber", label: "Amber", swatch: "hsl(28 78% 40%)" },
  { id: "violet", label: "Violet", swatch: "hsl(288 78% 50%)" },
];

export const SETTINGS_KEY = "cvt:settings";

export function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref !== "system") return pref;
  try {
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Writes the settings onto <html> so CSS variables pick them up. */
export function applySettings(s: Settings) {
  const el = document.documentElement;
  el.dataset.theme = resolveTheme(s.theme);
  el.dataset.accent = s.accent;
  el.dataset.density = s.density;
  el.dataset.effects = s.effects === false ? "off" : "on";
  el.dataset.variant = s.variant ?? "default";
}

/** Runs before first paint (inlined in the layout) so the page never flashes the wrong theme. */
export const SETTINGS_BOOT_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("${SETTINGS_KEY}")||"{}");var t=s.theme||"system";if(t==="system")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var d=document.documentElement;d.dataset.theme=t;d.dataset.accent=s.accent||"indigo";d.dataset.density=s.density||"comfortable";d.dataset.effects=s.effects===false?"off":"on";d.dataset.variant=s.variant||"default"}catch(e){}`;
