import type { CSSProperties } from "react";
import { MAX_AVATAR_DATA_URL_CHARS } from "./messengerAvatar";

const KEY = "retrogen_messenger_profile_appearance_v1";

export type MessengerBasicGradient = "g1" | "g2" | "g3" | "g4" | "g5";
export type MessengerExtendedGradient = "e1" | "e2" | "e3" | "e4" | "e5" | "e6" | "e7" | "e8" | "e9" | "e10";
export type MessengerHeroBackgroundId = MessengerBasicGradient | MessengerExtendedGradient | "custom";
/** «default» — стандартная тема приложения (без своего фона) */
export type MessengerPanelBackgroundId = MessengerHeroBackgroundId | "default";

export type MessengerAvatarShape = "circle" | "rounded" | "square";
export type MessengerNameScale = "small" | "normal" | "large";
export type MessengerBackgroundLayer = "hero" | "panel";

export type MessengerBackgroundFields = {
  background: MessengerHeroBackgroundId;
  solidColor: string;
  imageDataUrl: string | null;
};

export type MessengerProfileAppearance = {
  heroBackground: MessengerHeroBackgroundId;
  /** Сплошной цвет фона карточки (#RRGGBB); приоритет ниже картинки, выше градиента */
  heroSolidColor: string;
  heroImageDataUrl: string | null;
  panelBackground: MessengerPanelBackgroundId;
  panelSolidColor: string;
  panelImageDataUrl: string | null;
  avatarShape: MessengerAvatarShape;
  nameScale: MessengerNameScale;
  /** Подписи полей в нижнем блоке (О себе, Город…) — #RRGGBB или пусто = по умолчанию */
  detailsLabelColor: string;
  /** Значения полей в нижнем блоке — #RRGGBB или пусто = по умолчанию */
  detailsValueColor: string;
  settingsPrivacyBackground: MessengerPanelBackgroundId;
  settingsPrivacySolidColor: string;
  settingsPrivacyImageDataUrl: string | null;
  settingsNotificationsBackground: MessengerPanelBackgroundId;
  settingsNotificationsSolidColor: string;
  settingsNotificationsImageDataUrl: string | null;
  settingsDataBackground: MessengerPanelBackgroundId;
  settingsDataSolidColor: string;
  settingsDataImageDataUrl: string | null;
  settingsLanguageBackground: MessengerPanelBackgroundId;
  settingsLanguageSolidColor: string;
  settingsLanguageImageDataUrl: string | null;
};

export type MessengerSettingsButtonId = "privacy" | "notifications" | "data" | "language";

export type MessengerAppearanceBgTarget =
  | { kind: "hero" }
  | { kind: "panel" }
  | { kind: "settings"; buttonId: MessengerSettingsButtonId };

type SettingsButtonKeys = {
  background: keyof MessengerProfileAppearance;
  solidColor: keyof MessengerProfileAppearance;
  imageDataUrl: keyof MessengerProfileAppearance;
  legacyColor?: string;
};

export const SETTINGS_BUTTON_KEYS: Record<MessengerSettingsButtonId, SettingsButtonKeys> = {
  privacy: {
    background: "settingsPrivacyBackground",
    solidColor: "settingsPrivacySolidColor",
    imageDataUrl: "settingsPrivacyImageDataUrl",
    legacyColor: "settingsPrivacyColor",
  },
  notifications: {
    background: "settingsNotificationsBackground",
    solidColor: "settingsNotificationsSolidColor",
    imageDataUrl: "settingsNotificationsImageDataUrl",
    legacyColor: "settingsNotificationsColor",
  },
  data: {
    background: "settingsDataBackground",
    solidColor: "settingsDataSolidColor",
    imageDataUrl: "settingsDataImageDataUrl",
    legacyColor: "settingsDataColor",
  },
  language: {
    background: "settingsLanguageBackground",
    solidColor: "settingsLanguageSolidColor",
    imageDataUrl: "settingsLanguageImageDataUrl",
    legacyColor: "settingsLanguageColor",
  },
};

export const MESSENGER_SETTINGS_BUTTONS: { id: MessengerSettingsButtonId; label: string }[] = [
  { id: "privacy", label: "Конфиденциальность" },
  { id: "notifications", label: "Уведомления и звуки" },
  { id: "data", label: "Данные и память" },
  { id: "language", label: "Язык" },
];

export type MessengerBasicGradientOption = {
  id: MessengerBasicGradient;
  label: string;
  css: string;
};

export type MessengerExtendedGradientOption = {
  id: MessengerExtendedGradient;
  label: string;
  css: string;
};

/** Базовые градиенты — компактный выбор в панели */
export const MESSENGER_BASIC_GRADIENTS: MessengerBasicGradientOption[] = [
  {
    id: "g1",
    label: "Полночь",
    css: "linear-gradient(145deg, #0f0c29 0%, #1a1a3e 38%, #24243e 72%, #302b63 100%)",
  },
  {
    id: "g2",
    label: "Океан",
    css: "linear-gradient(145deg, #021b3a 0%, #0378a6 42%, #00b4d8 78%, #90e0ef 100%)",
  },
  {
    id: "g3",
    label: "Аметист",
    css: "linear-gradient(145deg, #1e0533 0%, #5b21b6 40%, #a855f7 72%, #e9d5ff 100%)",
  },
  {
    id: "g4",
    label: "Изумруд",
    css: "linear-gradient(145deg, #022c22 0%, #047857 45%, #34d399 75%, #a7f3d0 100%)",
  },
  {
    id: "g5",
    label: "Закат",
    css: "linear-gradient(145deg, #450a0a 0%, #c2410c 38%, #fb923c 68%, #fde68a 100%)",
  },
];

/** Расширенные градиенты — в модале «Больше» */
export const MESSENGER_EXTENDED_GRADIENTS: MessengerExtendedGradientOption[] = [
  {
    id: "e1",
    label: "Сияние",
    css: "linear-gradient(125deg, #000428 0%, #004e92 35%, #00c6ff 70%, #92fe9d 100%)",
  },
  {
    id: "e2",
    label: "Неон",
    css: "linear-gradient(135deg, #240046 0%, #7b2cbf 30%, #ff006e 65%, #ffbe0b 100%)",
  },
  {
    id: "e3",
    label: "Персик",
    css: "linear-gradient(140deg, #ff6b6b 0%, #feca57 45%, #ff9ff3 75%, #54a0ff 100%)",
  },
  {
    id: "e4",
    label: "Лаванда",
    css: "linear-gradient(150deg, #2d1b69 0%, #11998e 50%, #38ef7d 100%)",
  },
  {
    id: "e5",
    label: "Вулкан",
    css: "linear-gradient(160deg, #1a0000 0%, #8b0000 35%, #ff4500 65%, #ffd700 100%)",
  },
  {
    id: "e6",
    label: "Лёд",
    css: "linear-gradient(135deg, #0c1445 0%, #3a7bd5 40%, #6dd5ed 70%, #ffffff 100%)",
  },
  {
    id: "e7",
    label: "Виноград",
    css: "linear-gradient(145deg, #200122 0%, #6f0000 40%, #c31432 70%, #240b36 100%)",
  },
  {
    id: "e8",
    label: "Мята",
    css: "linear-gradient(130deg, #134e5e 0%, #71b280 55%, #d4fc79 100%)",
  },
  {
    id: "e9",
    label: "Космос",
    css: "radial-gradient(ellipse 120% 100% at 20% 0%, #667eea 0%, transparent 50%), radial-gradient(ellipse 100% 80% at 80% 100%, #764ba2 0%, transparent 50%), linear-gradient(180deg, #0f0c29 0%, #1a1a2e 100%)",
  },
  {
    id: "e10",
    label: "Золото",
    css: "linear-gradient(145deg, #1c1c1c 0%, #4a3728 30%, #c9a227 60%, #f4e4bc 100%)",
  },
];

const ALL_GRADIENTS = [...MESSENGER_BASIC_GRADIENTS, ...MESSENGER_EXTENDED_GRADIENTS];
const GRADIENT_BY_ID = new Map(ALL_GRADIENTS.map((g) => [g.id, g]));

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export function normalizeAppearanceColor(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const t = raw.trim();
  return HEX_COLOR_RE.test(t) ? t.toLowerCase() : "";
}

const defaults: MessengerProfileAppearance = {
  heroBackground: "g1",
  heroSolidColor: "",
  heroImageDataUrl: null,
  panelBackground: "default",
  panelSolidColor: "",
  panelImageDataUrl: null,
  avatarShape: "rounded",
  nameScale: "normal",
  detailsLabelColor: "",
  detailsValueColor: "",
  settingsPrivacyBackground: "default",
  settingsPrivacySolidColor: "",
  settingsPrivacyImageDataUrl: null,
  settingsNotificationsBackground: "default",
  settingsNotificationsSolidColor: "",
  settingsNotificationsImageDataUrl: null,
  settingsDataBackground: "default",
  settingsDataSolidColor: "",
  settingsDataImageDataUrl: null,
  settingsLanguageBackground: "default",
  settingsLanguageSolidColor: "",
  settingsLanguageImageDataUrl: null,
};

/** Сплошные цвета фона карточки профиля */
export const MESSENGER_HERO_SOLID_PRESETS: { id: string; label: string; hex: string }[] = [
  { id: "zinc", label: "Графит", hex: "#3f3f46" },
  { id: "slate", label: "Сланец", hex: "#334155" },
  { id: "navy", label: "Синий", hex: "#1e3a5f" },
  { id: "plum", label: "Сливовый", hex: "#4c1d95" },
  { id: "forest", label: "Зелёный", hex: "#14532d" },
];

export const MESSENGER_DETAILS_LABEL_COLOR_PRESETS: { id: string; label: string; hex: string }[] = [
  { id: "auto", label: "Авто", hex: "" },
  { id: "muted", label: "Светлый", hex: "#e4e4e7" },
  { id: "sky", label: "Небесный", hex: "#7dd3fc" },
  { id: "rose", label: "Розовый", hex: "#fda4af" },
  { id: "amber", label: "Янтарь", hex: "#fcd34d" },
];

export const MESSENGER_DETAILS_VALUE_COLOR_PRESETS: { id: string; label: string; hex: string }[] = [
  { id: "auto", label: "Авто", hex: "" },
  { id: "white", label: "Белый", hex: "#fafafa" },
  { id: "sky", label: "Голубой", hex: "#bae6fd" },
  { id: "mint", label: "Мятный", hex: "#a7f3d0" },
  { id: "peach", label: "Персик", hex: "#fecaca" },
];

function readSettingsButtonFields(
  appearance: MessengerProfileAppearance,
  id: MessengerSettingsButtonId,
): MessengerBackgroundFields {
  const keys = SETTINGS_BUTTON_KEYS[id];
  const background = appearance[keys.background] as MessengerPanelBackgroundId;
  return {
    background: background === "default" ? "g1" : background,
    solidColor: appearance[keys.solidColor] as string,
    imageDataUrl: appearance[keys.imageDataUrl] as string | null,
  };
}

type SettingsButtonSlice<K extends MessengerSettingsButtonId> = Pick<
  MessengerProfileAppearance,
  | (typeof SETTINGS_BUTTON_KEYS)[K]["background"]
  | (typeof SETTINGS_BUTTON_KEYS)[K]["solidColor"]
  | (typeof SETTINGS_BUTTON_KEYS)[K]["imageDataUrl"]
>;

type AllSettingsButtonFields = Pick<
  MessengerProfileAppearance,
  | "settingsPrivacyBackground"
  | "settingsPrivacySolidColor"
  | "settingsPrivacyImageDataUrl"
  | "settingsNotificationsBackground"
  | "settingsNotificationsSolidColor"
  | "settingsNotificationsImageDataUrl"
  | "settingsDataBackground"
  | "settingsDataSolidColor"
  | "settingsDataImageDataUrl"
  | "settingsLanguageBackground"
  | "settingsLanguageSolidColor"
  | "settingsLanguageImageDataUrl"
>;

function normalizeAllSettingsButtons(
  p: Partial<MessengerProfileAppearance> & Record<string, unknown>,
): AllSettingsButtonFields {
  return {
    ...normalizeSettingsButtonSlice(p, "privacy"),
    ...normalizeSettingsButtonSlice(p, "notifications"),
    ...normalizeSettingsButtonSlice(p, "data"),
    ...normalizeSettingsButtonSlice(p, "language"),
  };
}

function normalizeSettingsButtonSlice<K extends MessengerSettingsButtonId>(
  p: Partial<MessengerProfileAppearance> & Record<string, unknown>,
  id: K,
): SettingsButtonSlice<K> {
  const keys = SETTINGS_BUTTON_KEYS[id];
  const legacyHex =
    keys.legacyColor && typeof p[keys.legacyColor] === "string"
      ? normalizeAppearanceColor(p[keys.legacyColor])
      : "";
  const { panelBackground, panelImageDataUrl } = normalizePanelBackground(
    p[keys.background] ?? (legacyHex ? "custom" : "default"),
    p[keys.imageDataUrl],
  );
  let solid = normalizeAppearanceColor(p[keys.solidColor] as string | undefined);
  if (!solid && legacyHex && !panelImageDataUrl) solid = legacyHex;
  return {
    [keys.background]: panelBackground,
    [keys.solidColor]: panelImageDataUrl ? "" : solid,
    [keys.imageDataUrl]: panelImageDataUrl,
  } as SettingsButtonSlice<K>;
}

export function isSettingsButtonDefault(
  appearance: MessengerProfileAppearance,
  id: MessengerSettingsButtonId,
): boolean {
  const keys = SETTINGS_BUTTON_KEYS[id];
  return (
    appearance[keys.background] === "default" &&
    !appearance[keys.solidColor] &&
    !appearance[keys.imageDataUrl]
  );
}

export function isSettingsButtonBasicGradientSelected(
  appearance: MessengerProfileAppearance,
  id: MessengerSettingsButtonId,
  gradientId: MessengerBasicGradient,
): boolean {
  if (isSettingsButtonDefault(appearance, id)) return false;
  const keys = SETTINGS_BUTTON_KEYS[id];
  return (
    !appearance[keys.imageDataUrl] &&
    !appearance[keys.solidColor] &&
    appearance[keys.background] === gradientId
  );
}

export function isSettingsButtonSolidPresetSelected(
  appearance: MessengerProfileAppearance,
  id: MessengerSettingsButtonId,
  hex: string,
): boolean {
  const keys = SETTINGS_BUTTON_KEYS[id];
  return (
    !!appearance[keys.solidColor] &&
    !appearance[keys.imageDataUrl] &&
    appearance[keys.solidColor] === hex
  );
}

const BASIC_IDS = new Set(MESSENGER_BASIC_GRADIENTS.map((g) => g.id));
const EXTENDED_IDS = new Set(MESSENGER_EXTENDED_GRADIENTS.map((g) => g.id));

function normalizeBackground(
  rawBg: unknown,
  rawImage: unknown,
  legacyGradient?: unknown,
): Pick<MessengerProfileAppearance, "heroBackground" | "heroImageDataUrl"> {
  const image =
    typeof rawImage === "string" && rawImage.trim().startsWith("data:image/") ? rawImage.trim() : null;
  if (image && image.length <= MAX_AVATAR_DATA_URL_CHARS) {
    return { heroBackground: "custom", heroImageDataUrl: image };
  }

  if (typeof rawBg === "string") {
    if (rawBg === "custom") return { heroBackground: "custom", heroImageDataUrl: null };
    if (BASIC_IDS.has(rawBg as MessengerBasicGradient) || EXTENDED_IDS.has(rawBg as MessengerExtendedGradient)) {
      return { heroBackground: rawBg as MessengerHeroBackgroundId, heroImageDataUrl: null };
    }
  }

  if (typeof legacyGradient === "string" && BASIC_IDS.has(legacyGradient as MessengerBasicGradient)) {
    return { heroBackground: legacyGradient as MessengerBasicGradient, heroImageDataUrl: null };
  }
  if (legacyGradient === "soft") return { heroBackground: "g2", heroImageDataUrl: null };
  if (legacyGradient === "contrast") return { heroBackground: "g3", heroImageDataUrl: null };

  return { heroBackground: "g1", heroImageDataUrl: null };
}

function normalizePanelBackground(
  rawBg: unknown,
  rawImage: unknown,
): Pick<MessengerProfileAppearance, "panelBackground" | "panelImageDataUrl"> {
  const image =
    typeof rawImage === "string" && rawImage.trim().startsWith("data:image/") ? rawImage.trim() : null;
  if (image && image.length <= MAX_AVATAR_DATA_URL_CHARS) {
    return { panelBackground: "custom", panelImageDataUrl: image };
  }

  if (typeof rawBg === "string") {
    if (rawBg === "default") return { panelBackground: "default", panelImageDataUrl: null };
    if (rawBg === "custom") return { panelBackground: "custom", panelImageDataUrl: null };
    if (BASIC_IDS.has(rawBg as MessengerBasicGradient) || EXTENDED_IDS.has(rawBg as MessengerExtendedGradient)) {
      return { panelBackground: rawBg as MessengerHeroBackgroundId, panelImageDataUrl: null };
    }
  }

  return { panelBackground: "default", panelImageDataUrl: null };
}

function normalizeAvatarShape(raw: unknown): MessengerAvatarShape {
  if (raw === "circle" || raw === "square") return raw;
  return "rounded";
}

function normalizeNameScale(raw: unknown): MessengerNameScale {
  if (raw === "small" || raw === "large") return raw;
  return "normal";
}

export function loadMessengerProfileAppearance(): MessengerProfileAppearance {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const p = JSON.parse(raw) as Partial<MessengerProfileAppearance> & {
      heroGradient?: string;
      heroVariant?: string;
    };
    const { heroBackground, heroImageDataUrl } = normalizeBackground(
      p.heroBackground ?? p.heroGradient,
      p.heroImageDataUrl,
      p.heroGradient ?? p.heroVariant,
    );
    const heroSolidColor = normalizeAppearanceColor(p.heroSolidColor);
    const { panelBackground, panelImageDataUrl } = normalizePanelBackground(p.panelBackground, p.panelImageDataUrl);
    const panelSolidColor = normalizeAppearanceColor(p.panelSolidColor);
    return {
      heroBackground,
      heroSolidColor: heroImageDataUrl ? "" : heroSolidColor,
      heroImageDataUrl,
      panelBackground,
      panelSolidColor: panelImageDataUrl ? "" : panelSolidColor,
      panelImageDataUrl,
      avatarShape: normalizeAvatarShape(p.avatarShape),
      nameScale: normalizeNameScale(p.nameScale),
      detailsLabelColor: normalizeAppearanceColor(p.detailsLabelColor),
      detailsValueColor: normalizeAppearanceColor(p.detailsValueColor),
      ...normalizeAllSettingsButtons(p),
    };
  } catch {
    return { ...defaults };
  }
}

export function saveMessengerProfileAppearance(p: MessengerProfileAppearance): MessengerProfileAppearance {
  const bg = normalizeBackground(p.heroBackground, p.heroImageDataUrl);
  const heroSolidColor = normalizeAppearanceColor(p.heroSolidColor);
  const panelBg = normalizePanelBackground(p.panelBackground, p.panelImageDataUrl);
  const panelSolidColor = normalizeAppearanceColor(p.panelSolidColor);
  const safe: MessengerProfileAppearance = {
    heroBackground: bg.heroBackground,
    heroSolidColor: bg.heroImageDataUrl ? "" : heroSolidColor,
    heroImageDataUrl: bg.heroImageDataUrl,
    panelBackground: panelBg.panelBackground,
    panelSolidColor: panelBg.panelImageDataUrl ? "" : panelSolidColor,
    panelImageDataUrl: panelBg.panelImageDataUrl,
    avatarShape: normalizeAvatarShape(p.avatarShape),
    nameScale: normalizeNameScale(p.nameScale),
    detailsLabelColor: normalizeAppearanceColor(p.detailsLabelColor),
    detailsValueColor: normalizeAppearanceColor(p.detailsValueColor),
    ...normalizeAllSettingsButtons(p),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(safe));
  } catch {
    /* quota */
  }
  return safe;
}

export function isGradientBackground(id: MessengerHeroBackgroundId): id is MessengerBasicGradient | MessengerExtendedGradient {
  return id !== "custom";
}

export function heroUsesSolidColor(appearance: MessengerProfileAppearance): boolean {
  return !!appearance.heroSolidColor && !appearance.heroImageDataUrl;
}

export function readBackgroundLayer(
  appearance: MessengerProfileAppearance,
  layer: MessengerBackgroundLayer,
): MessengerBackgroundFields {
  if (layer === "hero") {
    return {
      background: appearance.heroBackground,
      solidColor: appearance.heroSolidColor,
      imageDataUrl: appearance.heroImageDataUrl,
    };
  }
  const background =
    appearance.panelBackground === "default" ? "g1" : appearance.panelBackground;
  return {
    background,
    solidColor: appearance.panelSolidColor,
    imageDataUrl: appearance.panelImageDataUrl,
  };
}

export type MessengerBackgroundPatch = Partial<MessengerBackgroundFields> & {
  panelBackground?: MessengerPanelBackgroundId;
};

export function patchSettingsButton(
  appearance: MessengerProfileAppearance,
  id: MessengerSettingsButtonId,
  patch: MessengerBackgroundPatch,
): MessengerProfileAppearance {
  const keys = SETTINGS_BUTTON_KEYS[id];
  const bg = patch.panelBackground ?? patch.background;
  return {
    ...appearance,
    ...normalizeSettingsButtonSlice(
      {
        [keys.background]: bg ?? appearance[keys.background],
        [keys.solidColor]: patch.solidColor ?? appearance[keys.solidColor],
        [keys.imageDataUrl]: patch.imageDataUrl ?? appearance[keys.imageDataUrl],
      },
      id,
    ),
  };
}

export function patchBackgroundLayer(
  appearance: MessengerProfileAppearance,
  layer: MessengerBackgroundLayer,
  patch: MessengerBackgroundPatch,
): MessengerProfileAppearance {
  if (layer === "hero") {
    return {
      ...appearance,
      ...(patch.background !== undefined ? { heroBackground: patch.background } : {}),
      ...(patch.solidColor !== undefined ? { heroSolidColor: patch.solidColor } : {}),
      ...(patch.imageDataUrl !== undefined ? { heroImageDataUrl: patch.imageDataUrl } : {}),
    };
  }
  const next: MessengerProfileAppearance = { ...appearance };
  if (patch.panelBackground !== undefined) next.panelBackground = patch.panelBackground;
  else if (patch.background !== undefined) next.panelBackground = patch.background;
  if (patch.solidColor !== undefined) next.panelSolidColor = patch.solidColor;
  if (patch.imageDataUrl !== undefined) next.panelImageDataUrl = patch.imageDataUrl;
  return next;
}

export function isPanelThemeDefault(appearance: MessengerProfileAppearance): boolean {
  return (
    appearance.panelBackground === "default" &&
    !appearance.panelSolidColor &&
    !appearance.panelImageDataUrl
  );
}

/** Заводской фон карточек профиля: градиент g1 без своего цвета и картинки */
export function isHeroThemeDefault(appearance: MessengerProfileAppearance): boolean {
  return (
    appearance.heroBackground === "g1" &&
    !appearance.heroSolidColor &&
    !appearance.heroImageDataUrl
  );
}

export function isHeroThemeSelected(appearance: MessengerProfileAppearance): boolean {
  return isHeroThemeDefault(appearance);
}

export function isSettingsButtonExtendedOrCustomSelected(
  appearance: MessengerProfileAppearance,
  id: MessengerSettingsButtonId,
): boolean {
  if (isSettingsButtonDefault(appearance, id)) return false;
  const keys = SETTINGS_BUTTON_KEYS[id];
  if (appearance[keys.solidColor]) return false;
  if (appearance[keys.imageDataUrl]) return true;
  return EXTENDED_IDS.has(appearance[keys.background] as MessengerExtendedGradient);
}

export function messengerBackgroundStyle(
  fields: MessengerBackgroundFields,
  opts?: { imageOverlay?: boolean },
): CSSProperties {
  if (fields.imageDataUrl) {
    const overlay = opts?.imageOverlay
      ? "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%), "
      : "";
    return {
      backgroundImage: `${overlay}url("${fields.imageDataUrl}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (fields.solidColor) {
    return { background: fields.solidColor };
  }
  if (isGradientBackground(fields.background)) {
    const item = GRADIENT_BY_ID.get(fields.background);
    if (item) return { background: item.css };
  }
  return { background: MESSENGER_BASIC_GRADIENTS[0].css };
}

export function settingsButtonRowStyle(
  appearance: MessengerProfileAppearance,
  id: MessengerSettingsButtonId,
): CSSProperties | undefined {
  if (isSettingsButtonDefault(appearance, id)) return undefined;
  return messengerBackgroundStyle(readSettingsButtonFields(appearance, id));
}

/** Фон панели «Профиль» (не список чатов и не иконки слева) */
export function profilePanelStyle(appearance: MessengerProfileAppearance): CSSProperties | undefined {
  if (isPanelThemeDefault(appearance)) return undefined;
  return messengerBackgroundStyle(readBackgroundLayer(appearance, "panel"));
}

/** @deprecated используйте profilePanelStyle */
export function panelAsideStyle(appearance: MessengerProfileAppearance): CSSProperties | undefined {
  return profilePanelStyle(appearance);
}

export function heroCardStyle(appearance: MessengerProfileAppearance): CSSProperties {
  return messengerBackgroundStyle(readBackgroundLayer(appearance, "hero"), { imageOverlay: true });
}

export function avatarShapeClass(shape: MessengerAvatarShape): string {
  switch (shape) {
    case "circle":
      return "rounded-full";
    case "square":
      return "rounded-sm";
    default:
      return "rounded-2xl";
  }
}

/** Явный radius — надёжнее, чем только tailwind-класс на вложенном img */
export function avatarShapeStyle(shape: MessengerAvatarShape): CSSProperties {
  switch (shape) {
    case "circle":
      return { borderRadius: "9999px" };
    case "square":
      return { borderRadius: "4px" };
    default:
      return { borderRadius: "16px" };
  }
}

export function nameScaleClass(scale: MessengerNameScale): string {
  switch (scale) {
    case "small":
      return "text-xs";
    case "large":
      return "text-base";
    default:
      return "text-sm";
  }
}

export function isBasicGradientSelected(
  appearance: MessengerProfileAppearance,
  layer: MessengerBackgroundLayer,
  id: MessengerBasicGradient,
): boolean {
  if (layer === "panel") {
    if (isPanelThemeDefault(appearance)) return false;
    return (
      !appearance.panelImageDataUrl &&
      !appearance.panelSolidColor &&
      appearance.panelBackground === id
    );
  }
  if (isHeroThemeDefault(appearance)) return false;
  return (
    !appearance.heroImageDataUrl &&
    !appearance.heroSolidColor &&
    appearance.heroBackground === id
  );
}

export function isPanelThemeSelected(appearance: MessengerProfileAppearance): boolean {
  return isPanelThemeDefault(appearance);
}

export function isSolidPresetSelected(
  appearance: MessengerProfileAppearance,
  layer: MessengerBackgroundLayer,
  hex: string,
): boolean {
  if (layer === "panel") {
    return (
      !!appearance.panelSolidColor &&
      !appearance.panelImageDataUrl &&
      appearance.panelSolidColor === hex
    );
  }
  return (
    !!appearance.heroSolidColor && !appearance.heroImageDataUrl && appearance.heroSolidColor === hex
  );
}

/** @deprecated use isSolidPresetSelected(appearance, "hero", hex) */
export function isHeroSolidPresetSelected(appearance: MessengerProfileAppearance, hex: string): boolean {
  return isSolidPresetSelected(appearance, "hero", hex);
}

export function isExtendedOrCustomSelected(
  appearance: MessengerProfileAppearance,
  layer: MessengerBackgroundLayer,
): boolean {
  if (layer === "panel") {
    if (isPanelThemeDefault(appearance)) return false;
    if (appearance.panelSolidColor) return false;
    if (appearance.panelImageDataUrl) return true;
    return EXTENDED_IDS.has(appearance.panelBackground as MessengerExtendedGradient);
  }
  if (appearance.heroSolidColor) return false;
  if (appearance.heroImageDataUrl) return true;
  return EXTENDED_IDS.has(appearance.heroBackground as MessengerExtendedGradient);
}
