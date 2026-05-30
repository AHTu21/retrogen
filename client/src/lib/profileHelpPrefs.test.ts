import { beforeEach, describe, expect, it } from "vitest";
import { loadProfileUiPrefs, saveProfileUiPrefs, setProfileTipsHidden } from "./profileHelpPrefs";

const KEY = "retrogen_profile_ui_v1";

describe("profileHelpPrefs", () => {
  beforeEach(() => {
    localStorage.removeItem(KEY);
  });

  it("defaults hideTips to false", () => {
    expect(loadProfileUiPrefs().hideTips).toBe(false);
  });

  it("persists hideTips", () => {
    saveProfileUiPrefs({ hideTips: true });
    expect(loadProfileUiPrefs().hideTips).toBe(true);
  });

  it("setProfileTipsHidden updates storage", () => {
    setProfileTipsHidden(true);
    expect(loadProfileUiPrefs().hideTips).toBe(true);
    setProfileTipsHidden(false);
    expect(loadProfileUiPrefs().hideTips).toBe(false);
  });
});
