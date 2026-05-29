/** Лёгкая валидация полей профиля (без Zod — только подсказки в UI). */

export function validateTelegram(raw: string): string | null {
  const t = raw.trim().replace(/^@+/, "");
  if (!t) return null;
  if (t.length < 3) return "Минимум 3 символа";
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(t)) return "Только латиница, цифры и _";
  return null;
}

export function validateWebsite(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
    if (!["http:", "https:"].includes(url.protocol)) return "Нужен адрес http или https";
    if (!url.hostname.includes(".")) return "Укажите полный домен";
    return null;
  } catch {
    return "Некорректный URL";
  }
}
