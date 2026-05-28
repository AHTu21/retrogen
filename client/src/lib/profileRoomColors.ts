import { normalizeProfileAccent } from "./profileAccent";

const DATA_IMAGE_RE = /^data:image\//i;

/** Локальная копия логики из profilePrefs — без циклического импорта. */
function backdropForPreview(backdrop: string, avatarDataUrl: string | null): string {
  const b = backdrop.trim();
  if (!b || DATA_IMAGE_RE.test(b)) return "";
  const a = avatarDataUrl?.trim() || null;
  if (a && b === a) return "";
  return b;
}

export type RoomColorPreset = { id: string; label: string; hex: string };

export const DEFAULT_BOARD_BACKDROP = "#e4e4e7";
export const DEFAULT_HEADER_TINT = "#f8fafc";

export const BOARD_BACKDROP_PRESETS: RoomColorPreset[] = [
  { id: "zinc", label: "Светлый", hex: "#e4e4e7" },
  { id: "snow", label: "Белый", hex: "#f8fafc" },
  { id: "mist", label: "Туман", hex: "#cbd5e1" },
  { id: "sky", label: "Небо", hex: "#bae6fd" },
  { id: "mint", label: "Мята", hex: "#ccfbf1" },
  { id: "slate", label: "Сланец", hex: "#1e293b" },
  { id: "night", label: "Ночь", hex: "#0f172a" },
  { id: "coal", label: "Уголь", hex: "#18181b" },
];

export const HEADER_TINT_PRESETS: RoomColorPreset[] = [
  { id: "white", label: "Белая", hex: "#ffffff" },
  { id: "frost", label: "Иней", hex: "#f8fafc" },
  { id: "glass", label: "Стекло", hex: "#e2e8f0" },
  { id: "ink", label: "Тёмная", hex: "#0f172a" },
  { id: "coal", label: "Графит", hex: "#27272a" },
  { id: "night", label: "Ночь", hex: "#09090b" },
];

const HEX_RE = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;

function isCssColorHex(raw: string): boolean {
  return HEX_RE.test(raw.trim());
}

/** Только #RGB / #RRGGBB; gradient/rgba/data URL → дефолт. */
export function normalizeBoardBackdropColor(raw: string | undefined | null): string {
  const t = (raw ?? "").trim();
  if (!t || !isCssColorHex(t)) return DEFAULT_BOARD_BACKDROP;
  return normalizeProfileAccent(t);
}

export function normalizeHeaderTintColor(raw: string | undefined | null): string {
  const t = (raw ?? "").trim();
  if (!t) return DEFAULT_HEADER_TINT;
  if (isCssColorHex(t)) return normalizeProfileAccent(t);
  if (/rgba?\(\s*255\s*,\s*255\s*,\s*255/i.test(t)) return "#ffffff";
  if (/rgba?\(\s*15\s*,\s*23\s*,\s*42/i.test(t)) return "#0f172a";
  if (/rgba?\(\s*24\s*,\s*24\s*,\s*27/i.test(t)) return "#18181b";
  return DEFAULT_HEADER_TINT;
}

function hexRelativeLuminance(hex: string): number {
  const h = normalizeProfileAccent(hex).slice(1);
  const channel = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** Подсказка, если фон и шапка слишком близки по яркости (WCAG-упрощённо). */
export function roomPaletteContrastHint(boardBackdrop: string, headerTint: string): string | null {
  const bg = normalizeBoardBackdropColor(boardBackdrop);
  const header = normalizeHeaderTintColor(headerTint);
  const bgL = hexRelativeLuminance(bg);
  const headerL = hexRelativeLuminance(header);
  const ratio = (Math.max(bgL, headerL) + 0.05) / (Math.min(bgL, headerL) + 0.05);
  if (ratio < 1.35) {
    return "Фон и шапка почти сливаются — выберите более контрастную пару.";
  }
  return null;
}

/** Цвета превью доски — от настроек комнаты, не от темы приложения. */
export function resolveBoardPreviewColors(
  boardBackdrop: string,
  headerTint: string,
  avatarDataUrl: string | null,
) {
  const bg = normalizeBoardBackdropColor(
    backdropForPreview(boardBackdrop, avatarDataUrl) || boardBackdrop,
  );
  const header = normalizeHeaderTintColor(headerTint);
  const isLightBoard = hexRelativeLuminance(bg) > 0.45;
  return { bg, header, isLightBoard };
}
