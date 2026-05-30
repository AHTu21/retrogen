import { describe, expect, it } from "vitest";
import {
  SIZE_PRESETS,
  applySizePreset,
  clampLayout,
  centerWindow,
  defaultLayout,
  loadSettingsHubLayout,
  MIN_HEIGHT,
  MIN_WIDTH,
  saveSettingsHubLayout,
  SETTINGS_LAYOUT_KEY,
} from "./settingsHubLayout";

describe("settingsHubLayout", () => {
  it("centers window within viewport", () => {
    const { x, y } = centerWindow(960, 640);
    expect(x).toBeGreaterThanOrEqual(16);
    expect(y).toBeGreaterThanOrEqual(16);
  });

  it("clamps dimensions to minimums", () => {
    const clamped = clampLayout({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      mode: "window",
      preset: "sm",
      section: "general",
    });
    expect(clamped.width).toBeGreaterThanOrEqual(MIN_WIDTH);
    expect(clamped.height).toBeGreaterThanOrEqual(MIN_HEIGHT);
  });

  it("applySizePreset updates size and centers", () => {
    const base = defaultLayout();
    const lg = applySizePreset("lg", base);
    expect(lg.width).toBeLessThanOrEqual(SIZE_PRESETS.lg.width);
    expect(lg.width).toBeGreaterThanOrEqual(MIN_WIDTH);
    expect(lg.height).toBeLessThanOrEqual(SIZE_PRESETS.lg.height);
    expect(lg.preset).toBe("lg");
    expect(lg.mode).toBe("window");
  });

  it("persists and restores layout from localStorage", () => {
    localStorage.removeItem(SETTINGS_LAYOUT_KEY);
    const initial = defaultLayout();
    saveSettingsHubLayout({ ...initial, section: "board", preset: "sm" });
    const loaded = loadSettingsHubLayout();
    expect(loaded.section).toBe("board");
    expect(loaded.preset).toBe("sm");
    localStorage.removeItem(SETTINGS_LAYOUT_KEY);
  });
});
