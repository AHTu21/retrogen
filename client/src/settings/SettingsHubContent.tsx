import { useSettingsHub } from "./SettingsHubProvider";
import type { SettingsSectionId } from "./settingsHubTypes";
import { SettingsBoardPanel } from "./panels/SettingsBoardPanel";
import { SettingsChatPanel } from "./panels/SettingsChatPanel";
import { SettingsComingSoonPanel } from "./panels/SettingsComingSoonPanel";
import { SettingsGeneralPanel } from "./panels/SettingsGeneralPanel";
import { SettingsNotificationsPanel } from "./panels/SettingsNotificationsPanel";
import { SettingsProfilePanel } from "./panels/SettingsProfilePanel";
import { SettingsSecurityPanel } from "./panels/SettingsSecurityPanel";

function panelFor(section: SettingsSectionId) {
  switch (section) {
    case "general":
      return <SettingsGeneralPanel />;
    case "profile":
      return <SettingsProfilePanel />;
    case "board":
      return <SettingsBoardPanel />;
    case "chat":
      return <SettingsChatPanel />;
    case "notifications":
      return <SettingsNotificationsPanel />;
    case "security":
      return <SettingsSecurityPanel />;
    case "workshop":
      return <SettingsComingSoonPanel />;
    default:
      return <SettingsGeneralPanel />;
  }
}

export function SettingsHubContent() {
  const { section } = useSettingsHub();
  return panelFor(section);
}
