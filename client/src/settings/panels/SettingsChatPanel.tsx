import { useCallback, useState } from "react";
import {
  loadMessengerProfileAppearance,
  saveMessengerProfileAppearance,
  type MessengerProfileAppearance,
} from "../../lib/messengerProfileAppearance";
import { MessengerProfileAppearancePanel } from "../../components/messenger/MessengerProfileAppearancePanel";
import { useSettingsHubPrefs } from "../SettingsHubProvider";
import { SettingsHubFootnote, SettingsHubLink, SettingsHubPanel, SettingsHubSectionHeader } from "../settingsHubUi";

export function SettingsChatPanel() {
  const { d, isLight } = useSettingsHubPrefs();
  const [applied, setApplied] = useState<MessengerProfileAppearance>(() => loadMessengerProfileAppearance());

  const onApply = useCallback((next: MessengerProfileAppearance) => {
    const saved = saveMessengerProfileAppearance(next);
    setApplied(saved);
    window.dispatchEvent(new CustomEvent("retrogen-messenger-appearance"));
  }, []);

  return (
    <SettingsHubPanel wide>
      <SettingsHubSectionHeader sectionId="chat" d={d} />

      <div className="settings-hub-messenger -mx-1 min-w-0 overflow-x-clip sm:-mx-2">
        <MessengerProfileAppearancePanel
          isLight={isLight}
          applied={applied}
          embedded
          onClose={() => {}}
          onApply={onApply}
        />
      </div>

      <SettingsHubFootnote d={d}>
        Оформление применяется только к карточке профиля в{" "}
        <SettingsHubLink to="/messages" className={d.link}>
          мессенджере
        </SettingsHubLink>
        .
      </SettingsHubFootnote>
    </SettingsHubPanel>
  );
}
