/** Идентификаторы разделов центра настроек Retrogen. */
export type SettingsSectionId =
  | "general"
  | "profile"
  | "board"
  | "chat"
  | "notifications"
  | "security"
  | "workshop";

export type SettingsSectionGroup = "app" | "profile" | "modules";

export type SettingsSectionStatus = "ready" | "soon";

export type SettingsSectionMeta = {
  id: SettingsSectionId;
  label: string;
  description: string;
  group: SettingsSectionGroup;
  groupLabel: string;
  status: SettingsSectionStatus;
  keywords: string[];
};

export type SettingsOpenOptions = {
  section?: SettingsSectionId;
};

export type SettingsWindowMode = "window" | "fullscreen";

export type SettingsSizePreset = "sm" | "md" | "lg";

export type SettingsHubLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  mode: SettingsWindowMode;
  preset: SettingsSizePreset;
  section: SettingsSectionId;
};

export const SETTINGS_OPEN_EVENT = "retrogen-settings-open";

export type SettingsOpenEventDetail = SettingsOpenOptions;
