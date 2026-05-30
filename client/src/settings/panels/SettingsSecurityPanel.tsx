import { SecurityDataPortability, SecuritySessionCard } from "../../pages/profile/profileSecurityUi";
import { useSettingsHubPrefs } from "../SettingsHubProvider";
import { SettingsHubFootnote, SettingsHubLink, SettingsHubPanel, SettingsHubSectionHeader } from "../settingsHubUi";

export function SettingsSecurityPanel() {
  const { d, authUser, onLogout, onExportBackup, onImportBackup } = useSettingsHubPrefs();

  return (
    <SettingsHubPanel>
      <SettingsHubSectionHeader sectionId="security" d={d} />

      <div className="space-y-6">
        <SecuritySessionCard d={d} authUser={authUser} onLogout={onLogout} />
        <SecurityDataPortability d={d} onExport={onExportBackup} onImport={onImportBackup} />

        <SettingsHubFootnote d={d}>
          Облачная синхронизация и расширенная безопасность — в{" "}
          <SettingsHubLink to="/profile#security" className={d.link}>
            профиле → Безопасность
          </SettingsHubLink>
          .
        </SettingsHubFootnote>
      </div>
    </SettingsHubPanel>
  );
}
