export const PROFILE_SIGNATURE_MAX = 1000;
export const PROFILE_DISPLAY_NAME_MAX = 120;
export const PROFILE_PROFILE_EMAIL_MAX = 120;
export const PROFILE_TELEGRAM_MAX = 32;
export const PROFILE_WEBSITE_MAX = 200;
export const PROFILE_CONTACT_MAX = 40;
export const PROFILE_EMOJI_STATUS_MAX = 8;

export type ProfileGenderValue = "" | "male" | "female" | "unspecified";

const GENDER_LABELS: Record<Exclude<ProfileGenderValue, "">, string> = {
  male: "Мужской",
  female: "Женский",
  unspecified: "Не определён",
};

export function normalizeGender(raw: string): ProfileGenderValue {
  const v = raw.trim().toLowerCase();
  if (!v) return "";
  if (v === "male" || v === "мужской" || v === "муж" || v === "м" || v === "m") return "male";
  if (v === "female" || v === "женский" || v === "жен" || v === "ж" || v === "f") return "female";
  if (
    v === "unspecified" ||
    v === "не определён" ||
    v === "не определен" ||
    v === "неопределён" ||
    v === "неопределен"
  ) {
    return "unspecified";
  }
  return "";
}

export function genderDisplayLabel(raw: string): string {
  const g = normalizeGender(raw);
  return g ? GENDER_LABELS[g] : "";
}

/** DD.MM.YYYY ↔ YYYY-MM-DD для input[type=date] */
export function birthDateToInputValue(ddmmyyyy: string): string {
  const m = ddmmyyyy.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return "";
  const d = m[1].padStart(2, "0");
  const mo = m[2].padStart(2, "0");
  const y = m[3];
  return `${y}-${mo}-${d}`;
}

export function birthDateFromInputValue(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}.${m[2]}.${m[1]}`;
}

export function clampSignature(text: string): string {
  return text.slice(0, PROFILE_SIGNATURE_MAX);
}
