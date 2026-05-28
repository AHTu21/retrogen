import type { CursorStyle } from "../../lib/profilePrefs";

export type RoomThemePreset = {
  id: string;
  label: string;
  description: string;
  boardBackdrop: string;
  headerTint: string;
  cursorStyle?: CursorStyle;
};

/** Готовые сочетания фона и шапки — быстрый старт без подбора вручную. */
export const ROOM_THEME_PRESETS: RoomThemePreset[] = [
  {
    id: "classic",
    label: "Классика",
    description: "Нейтральная светлая доска",
    boardBackdrop: "#e4e4e7",
    headerTint: "#ffffff",
  },
  {
    id: "paper",
    label: "Бумага",
    description: "Мягкий белый, для долгих сессий",
    boardBackdrop: "#f8fafc",
    headerTint: "#f1f5f9",
    cursorStyle: "default",
  },
  {
    id: "sky",
    label: "Небо",
    description: "Прохладные голубые тона",
    boardBackdrop: "#bae6fd",
    headerTint: "#f0f9ff",
  },
  {
    id: "mint",
    label: "Мята",
    description: "Спокойный зелёный акцент",
    boardBackdrop: "#ccfbf1",
    headerTint: "#ffffff",
  },
  {
    id: "slate",
    label: "Сланец",
    description: "Тёмная доска, светлые колонки",
    boardBackdrop: "#1e293b",
    headerTint: "#0f172a",
    cursorStyle: "crosshair",
  },
  {
    id: "focus",
    label: "Фокус",
    description: "Минимум отвлечений",
    boardBackdrop: "#18181b",
    headerTint: "#27272a",
    cursorStyle: "grab",
  },
];

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
