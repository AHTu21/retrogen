import { findDeniedSubstring, getThemeModerationMatchers } from "../config/themeModeration.js";

export function sanitizeTheme(raw: string): { ok: true; value: string } | { ok: false; reason: string } {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2) {
    return { ok: false, reason: "Тема слишком короткая" };
  }
  if (trimmed.length > 120) {
    return { ok: false, reason: "Не больше 120 символов" };
  }
  for (const re of getThemeModerationMatchers()) {
    if (re.test(trimmed)) {
      return { ok: false, reason: "Такую тему нельзя использовать" };
    }
  }
  const sub = findDeniedSubstring(trimmed);
  if (sub) {
    return { ok: false, reason: "Тема содержит запрещённую фразу" };
  }
  return { ok: true, value: trimmed };
}
