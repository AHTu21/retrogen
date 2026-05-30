import { describe, expect, it } from "vitest";
import { ROOM_THEME_PRESETS, roomPresetIsLightBoard } from "../pages/profile/profileRoomPresets";
import { normalizeBoardBackdropColor, normalizeHeaderTintColor, roomPaletteContrastHint } from "./profileRoomColors";

describe("room theme presets", () => {
  it("has unique ids", () => {
    const ids = ROOM_THEME_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each preset has distinct backdrop and header contrast", () => {
    for (const preset of ROOM_THEME_PRESETS) {
      const hint = roomPaletteContrastHint(preset.boardBackdrop, preset.headerTint);
      expect(hint, `preset "${preset.id}"`).toBeNull();
    }
  });

  it("roomPresetIsLightBoard matches tone for light themes", () => {
    const paper = ROOM_THEME_PRESETS.find((p) => p.id === "paper");
    expect(paper?.tone).toBe("light");
    expect(roomPresetIsLightBoard(paper!.boardBackdrop)).toBe(true);
    const slate = ROOM_THEME_PRESETS.find((p) => p.id === "slate");
    expect(slate?.tone).toBe("dark");
    expect(roomPresetIsLightBoard(slate!.boardBackdrop)).toBe(false);
  });

  it("colors normalize to valid hex", () => {
    for (const preset of ROOM_THEME_PRESETS) {
      expect(normalizeBoardBackdropColor(preset.boardBackdrop)).toMatch(/^#[0-9a-f]{6}$/);
      expect(normalizeHeaderTintColor(preset.headerTint)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
