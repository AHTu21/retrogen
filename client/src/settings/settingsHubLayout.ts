import type { SettingsHubLayout, SettingsSectionId, SettingsSizePreset, SettingsWindowMode } from "./settingsHubTypes";

export const SETTINGS_LAYOUT_KEY = "retrogen_settings_hub_v1";

export const SIZE_PRESETS: Record<SettingsSizePreset, { width: number; height: number }> = {
  sm: { width: 680, height: 540 },
  md: { width: 920, height: 680 },
  lg: { width: 1100, height: 780 },
};

export const MIN_WIDTH = 560;
export const MIN_HEIGHT = 440;
export const VIEWPORT_MARGIN = 16;

const DEFAULT_SECTION: SettingsSectionId = "general";
const DEFAULT_PRESET: SettingsSizePreset = "md";

export function centerWindow(width: number, height: number): { x: number; y: number } {
  if (typeof window === "undefined") return { x: VIEWPORT_MARGIN, y: VIEWPORT_MARGIN };
  return {
    x: Math.max(VIEWPORT_MARGIN, Math.round((window.innerWidth - width) / 2)),
    y: Math.max(VIEWPORT_MARGIN, Math.round((window.innerHeight - height) / 2)),
  };
}

export function clampLayout(layout: SettingsHubLayout): SettingsHubLayout {
  const maxW = typeof window !== "undefined" ? window.innerWidth - VIEWPORT_MARGIN * 2 : layout.width;
  const maxH = typeof window !== "undefined" ? window.innerHeight - VIEWPORT_MARGIN * 2 : layout.height;
  const width = Math.min(Math.max(layout.width, MIN_WIDTH), Math.max(MIN_WIDTH, maxW));
  const height = Math.min(Math.max(layout.height, MIN_HEIGHT), Math.max(MIN_HEIGHT, maxH));
  const maxX = typeof window !== "undefined" ? window.innerWidth - width - VIEWPORT_MARGIN : layout.x;
  const maxY = typeof window !== "undefined" ? window.innerHeight - height - VIEWPORT_MARGIN : layout.y;
  return {
    ...layout,
    width,
    height,
    x: Math.min(Math.max(layout.x, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, maxX)),
    y: Math.min(Math.max(layout.y, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, maxY)),
  };
}

export function defaultLayout(): SettingsHubLayout {
  const preset = SIZE_PRESETS[DEFAULT_PRESET];
  const pos = centerWindow(preset.width, preset.height);
  return {
    ...pos,
    width: preset.width,
    height: preset.height,
    mode: "window",
    preset: DEFAULT_PRESET,
    section: DEFAULT_SECTION,
  };
}

function isSectionId(v: unknown): v is SettingsSectionId {
  return (
    v === "general" ||
    v === "profile" ||
    v === "board" ||
    v === "chat" ||
    v === "notifications" ||
    v === "security" ||
    v === "workshop"
  );
}

function isPreset(v: unknown): v is SettingsSizePreset {
  return v === "sm" || v === "md" || v === "lg";
}

function isMode(v: unknown): v is SettingsWindowMode {
  return v === "window" || v === "fullscreen";
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function loadSettingsHubLayout(): SettingsHubLayout {
  try {
    const raw = localStorage.getItem(SETTINGS_LAYOUT_KEY);
    if (!raw) return defaultLayout();
    const p = JSON.parse(raw) as Partial<SettingsHubLayout>;
    const preset = isPreset(p.preset) ? p.preset : DEFAULT_PRESET;
    const base = SIZE_PRESETS[preset];
    const fallbackPos = centerWindow(base.width, base.height);
    const merged: SettingsHubLayout = {
      x: isFiniteNum(p.x) ? p.x : fallbackPos.x,
      y: isFiniteNum(p.y) ? p.y : fallbackPos.y,
      width: isFiniteNum(p.width) ? p.width : base.width,
      height: isFiniteNum(p.height) ? p.height : base.height,
      mode: isMode(p.mode) ? p.mode : "window",
      preset,
      section: isSectionId(p.section) ? p.section : DEFAULT_SECTION,
    };
    return clampLayout(merged);
  } catch {
    return defaultLayout();
  }
}

export function saveSettingsHubLayout(layout: SettingsHubLayout): void {
  try {
    localStorage.setItem(SETTINGS_LAYOUT_KEY, JSON.stringify(clampLayout(layout)));
  } catch {
    /* quota */
  }
}

export function applySizePreset(preset: SettingsSizePreset, current: SettingsHubLayout): SettingsHubLayout {
  const size = SIZE_PRESETS[preset];
  const pos = centerWindow(size.width, size.height);
  return clampLayout({
    ...current,
    ...pos,
    width: size.width,
    height: size.height,
    preset,
    mode: "window",
  });
}
