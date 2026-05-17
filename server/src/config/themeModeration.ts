/** Расширяемая модерация темы (без привязки к учётным записям). */

const DEFAULT_REGEX: RegExp[] = [/\b(hitler|nazi|nazis|porn|xxx)\b/i];

function parseDeniedSubstringsFromEnv(): string[] {
  const raw = process.env.RETROGEN_THEME_DENIED_SUBSTRINGS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 1 && s.length < 120);
}

let cachedSubstrings: string[] | null = null;

function deniedSubstrings(): string[] {
  if (cachedSubstrings === null) {
    cachedSubstrings = parseDeniedSubstringsFromEnv();
  }
  return cachedSubstrings;
}

/** Сброс кэша (для тестов). */
export function resetThemeModerationCache() {
  cachedSubstrings = null;
}

export function getThemeModerationMatchers(): RegExp[] {
  return [...DEFAULT_REGEX];
}

/** Дополнительные запреты: подстроки без регистра (из env через запятую). */
export function findDeniedSubstring(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const s of deniedSubstrings()) {
    if (lower.includes(s)) return s;
  }
  return undefined;
}
