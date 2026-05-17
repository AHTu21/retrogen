/** Детерминированные варианты копирайта и палитры от строки темы (без LLM). */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const ACCENT_PRESETS = ["#3d8bfd", "#22c55e", "#a855f7", "#f97316", "#14b8a6", "#e11d48"] as const;

export type ThemeVisualSeed = { accent: string; subtitleVariant: number };

export function themeVisualSeed(themeSanitized: string): ThemeVisualSeed {
  const h = hashString(themeSanitized.trim().toLowerCase());
  return {
    accent: ACCENT_PRESETS[h % ACCENT_PRESETS.length]!,
    subtitleVariant: h % 10_007,
  };
}
