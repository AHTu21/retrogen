import { createPortal } from "react-dom";
import { SettingsHubContent } from "./SettingsHubContent";
import { SettingsHubNav } from "./SettingsHubNav";
import { useSettingsHub, useSettingsHubPrefs } from "./SettingsHubProvider";
import { SettingsHubSizeToolbar, SettingsHubWindow } from "./SettingsHubWindow";

export function SettingsHubOverlay() {
  const { isOpen } = useSettingsHub();
  const { d, accentStyle, saveStatus } = useSettingsHubPrefs();

  if (!isOpen) return null;

  return createPortal(
    <SettingsHubWindow
      d={d}
      accentStyle={accentStyle}
      title="Настройки"
      saveStatus={saveStatus}
      nav={<SettingsHubNav />}
      toolbar={<SettingsHubSizeToolbar d={d} />}
    >
      <SettingsHubContent />
    </SettingsHubWindow>,
    document.body,
  );
}

