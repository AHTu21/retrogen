import type { CursorStyle } from "../../lib/profilePrefs";

export type RoomThemeTone = "light" | "dark" | "vivid";

export type RoomThemePreset = {
  id: string;
  label: string;
  description: string;
  tone: RoomThemeTone;
  boardBackdrop: string;
  headerTint: string;
  cursorStyle?: CursorStyle;
};

/** Готовые сочетания фона и шапки — подобраны по контрасту и настроению сессии. */
export const ROOM_THEME_PRESETS: RoomThemePreset[] = [
  {
    id: "classic",
    label: "Классика",
    description: "Нейтральный zinc — универсальный старт",
    tone: "light",
    boardBackdrop: "#e4e4e7",
    headerTint: "#ffffff",
  },
  {
    id: "paper",
    label: "Бумага",
    description: "Мягкий белый, меньше устают глаза",
    tone: "light",
    boardBackdrop: "#f4f4f5",
    headerTint: "#e4e4e7",
    cursorStyle: "default",
  },
  {
    id: "linen",
    label: "Лён",
    description: "Тёплые бежевые тона",
    tone: "light",
    boardBackdrop: "#ece5d8",
    headerTint: "#faf7f2",
  },
  {
    id: "sky",
    label: "Небо",
    description: "Прохладный голубой фон",
    tone: "light",
    boardBackdrop: "#bae6fd",
    headerTint: "#e0f2fe",
  },
  {
    id: "mint",
    label: "Мята",
    description: "Спокойный зелёный, фокус без напряжения",
    tone: "light",
    boardBackdrop: "#a7f3d0",
    headerTint: "#ecfdf5",
  },
  {
    id: "lavender",
    label: "Лаванда",
    description: "Мягкий фиолетовый акцент",
    tone: "light",
    boardBackdrop: "#ddd6fe",
    headerTint: "#f5f3ff",
  },
  {
    id: "sand",
    label: "Песок",
    description: "Тёплый жёлтый — энергия ретро",
    tone: "vivid",
    boardBackdrop: "#fde68a",
    headerTint: "#fffbeb",
    cursorStyle: "pointer",
  },
  {
    id: "retro",
    label: "Ретро",
    description: "Оранжевый workshop — как классическая доска",
    tone: "vivid",
    boardBackdrop: "#fed7aa",
    headerTint: "#ffedd5",
    cursorStyle: "pointer",
  },
  {
    id: "coral",
    label: "Коралл",
    description: "Розоватый фон, мягкое настроение",
    tone: "vivid",
    boardBackdrop: "#fecaca",
    headerTint: "#fff1f2",
  },
  {
    id: "slate",
    label: "Сланец",
    description: "Тёмная доска, светлые колонки",
    tone: "dark",
    boardBackdrop: "#0f172a",
    headerTint: "#64748b",
    cursorStyle: "crosshair",
  },
  {
    id: "graphite",
    label: "Графит",
    description: "Глубокий серый, минимум бликов",
    tone: "dark",
    boardBackdrop: "#27272a",
    headerTint: "#71717a",
  },
  {
    id: "midnight",
    label: "Полночь",
    description: "Синяя ночь, контрастная шапка",
    tone: "dark",
    boardBackdrop: "#0f172a",
    headerTint: "#1d4ed8",
    cursorStyle: "crosshair",
  },
  {
    id: "forest",
    label: "Лес",
    description: "Тёмно-зелёный, спокойная глубина",
    tone: "dark",
    boardBackdrop: "#14532d",
    headerTint: "#15803d",
  },
  {
    id: "focus",
    label: "Фокус",
    description: "Почти чёрный — ничего лишнего",
    tone: "dark",
    boardBackdrop: "#18181b",
    headerTint: "#52525b",
    cursorStyle: "grab",
  },
];

export const ROOM_THEME_TONE_LABELS: Record<RoomThemeTone, string> = {
  light: "Светлые",
  dark: "Тёмные",
  vivid: "Яркие",
};

const TONE_ORDER: RoomThemeTone[] = ["light", "vivid", "dark"];

/** Сортировка: светлые → яркие → тёмные (порядок в массиве внутри группы). */
export function sortRoomPresets(presets: RoomThemePreset[]): RoomThemePreset[] {
  return [...presets].sort((a, b) => TONE_ORDER.indexOf(a.tone) - TONE_ORDER.indexOf(b.tone));
}

export function roomPresetMatches(
  preset: RoomThemePreset,
  boardBackdrop: string,
  headerTint: string,
  normalizeBackdrop: (v: string) => string,
  normalizeHeader: (v: string) => string,
): boolean {
  return (
    normalizeBackdrop(boardBackdrop) === normalizeBackdrop(preset.boardBackdrop) &&
    normalizeHeader(headerTint) === normalizeHeader(preset.headerTint)
  );
}

/** Яркость фона доски — для превью колонок. */
export function roomPresetIsLightBoard(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.55;
}
