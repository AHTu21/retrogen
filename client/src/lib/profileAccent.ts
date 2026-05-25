/** Акцентный цвет страницы профиля (CSS-переменные --ph-*). */



/** Tailwind sky-600 — основной акцент кнопок и ссылок в приложении. */

export const DEFAULT_PROFILE_ACCENT = "#0284c7";



/** Старый дефолт профиля (изумруд); мигрируем на стандарт приложения. */

export const LEGACY_PROFILE_ACCENT = "#10b981";



export type ProfileAccentPreset = { id: string; label: string; hex: string };



export const PROFILE_ACCENT_PRESETS: ProfileAccentPreset[] = [

  { id: "app", label: "Как в приложении", hex: DEFAULT_PROFILE_ACCENT },

  { id: "sky", label: "Небо", hex: "#0ea5e9" },

  { id: "teal", label: "Бирюза", hex: "#14b8a6" },

  { id: "emerald", label: "Изумруд", hex: "#10b981" },

  { id: "violet", label: "Фиолет", hex: "#8b5cf6" },

  { id: "rose", label: "Роза", hex: "#f43f5e" },

  { id: "amber", label: "Янтарь", hex: "#f59e0b" },

  { id: "zinc", label: "Нейтраль", hex: "#71717a" },

];



/** Нормализует #RGB / #RRGGBB. */

export function normalizeProfileAccent(raw: string | undefined | null): string {

  const t = (raw ?? "").trim();

  if (!t) return DEFAULT_PROFILE_ACCENT;

  if (/^#[0-9a-fA-F]{3}$/.test(t)) {

    const r = t[1]!;

    const g = t[2]!;

    const b = t[3]!;

    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();

  }

  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase();

  return DEFAULT_PROFILE_ACCENT;

}



/** Палитра в духе System Settings: нейтральный фон, акцент только на действиях. */

const APP_SHELL_LIGHT = {

  "--ph-page-bg": "#f5f5f7",

  "--ph-sticky-bg": "rgb(245 245 247 / 0.72)",

  "--ph-text": "#1d1d1f",

  "--ph-muted": "#6e6e73",

  "--ph-border": "rgb(0 0 0 / 0.06)",

  "--ph-separator": "rgb(0 0 0 / 0.08)",

  "--ph-panel-bg": "#ffffff",

  "--ph-sidebar-bg": "rgb(255 255 255 / 0.55)",

  "--ph-identity-bg": "rgb(255 255 255 / 0.35)",

  "--ph-surface": "#ffffff",

  "--ph-surface-elevated": "#ffffff",

  "--ph-nav-idle": "#6e6e73",

  "--ph-nav-hover": "rgb(0 0 0 / 0.04)",

  "--ph-input-bg": "#ffffff",

  "--ph-input-border": "rgb(0 0 0 / 0.12)",

  "--ph-notepad-bg": "#f5f5f7",

  "--ph-preview-stage": "#ebebed",

  "--ph-setting-tray": "#f0f0f2",

  "--ph-shadow": "0 1px 2px rgb(0 0 0 / 0.04), 0 12px 40px rgb(0 0 0 / 0.08)",

} as const;



const APP_SHELL_DARK = {

  "--ph-page-bg": "#09090b",

  "--ph-sticky-bg": "rgb(9 9 11 / 0.82)",

  "--ph-text": "#f5f5f7",

  "--ph-muted": "#a1a1aa",

  "--ph-border": "rgb(255 255 255 / 0.07)",

  "--ph-separator": "rgb(255 255 255 / 0.08)",

  "--ph-panel-bg": "#111113",

  "--ph-sidebar-bg": "#111113",

  "--ph-identity-bg": "transparent",

  "--ph-surface": "#1a1a1d",

  "--ph-surface-elevated": "#242428",

  "--ph-preview-stage": "#0c0c0f",

  "--ph-setting-tray": "#16161a",

  "--ph-nav-idle": "#a1a1aa",

  "--ph-nav-hover": "rgb(255 255 255 / 0.06)",

  "--ph-input-bg": "#1c1c1e",

  "--ph-input-border": "rgb(255 255 255 / 0.14)",

  "--ph-notepad-bg": "#2c2c2e",

  "--ph-shadow": "0 0 0 1px rgb(255 255 255 / 0.06), 0 20px 50px rgb(0 0 0 / 0.55)",

} as const;



export function profileAccentCssVars(accentRaw: string, isLight: boolean): Record<string, string> {

  const accent = normalizeProfileAccent(accentRaw);

  const shell = isLight ? APP_SHELL_LIGHT : APP_SHELL_DARK;

  return {

    ...shell,

    "--ph-accent": accent,

    "--ph-nav-active-bg": isLight

      ? `color-mix(in srgb, ${accent} 12%, white)`

      : `color-mix(in srgb, ${accent} 28%, #2c2c2e)`,

    "--ph-nav-active-text": isLight

      ? `color-mix(in srgb, ${accent} 85%, #1d1d1f)`

      : `color-mix(in srgb, ${accent} 40%, #f5f5f7)`,

    "--ph-btn-bg": accent,

    "--ph-btn-bg-hover": isLight

      ? `color-mix(in srgb, ${accent} 88%, black)`

      : `color-mix(in srgb, ${accent} 92%, white)`,

    "--ph-link": accent,

  };

}


