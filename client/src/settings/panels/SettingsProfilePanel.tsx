import { useSettingsHubPrefs } from "../SettingsHubProvider";
import { ProfileCard, ProfileField } from "../../pages/profile/profileUi";
import { displayHandle } from "../../lib/profileUser";
import {
  SettingsHubActions,
  SettingsHubLink,
  SettingsHubPanel,
  SettingsHubSectionHeader,
} from "../settingsHubUi";

export function SettingsProfilePanel() {
  const { d, prefs, setPrefs, authUser } = useSettingsHubPrefs();

  return (
    <SettingsHubPanel>
      <SettingsHubSectionHeader sectionId="profile" d={d} />

      <SettingsHubActions>
        <SettingsHubLink to="/profile" className={d.btnSecondary}>
          Полный профиль
        </SettingsHubLink>
        <SettingsHubLink to="/profile#identity" className={d.btnGhost}>
          Контакты и аватар →
        </SettingsHubLink>
      </SettingsHubActions>

      <ProfileCard d={d} title="Основное" description="Сохраняется автоматически">
        <ProfileField d={d} label="Отображаемое имя" hint="В комнатах и мессенджере" stacked>
          <input
            className={d.field()}
            value={prefs.displayName}
            onChange={(e) => setPrefs({ ...prefs, displayName: e.target.value })}
            placeholder={displayHandle(prefs, authUser)}
            autoComplete="nickname"
          />
        </ProfileField>
        <ProfileField d={d} label="Telegram" hint="@username или t.me/…" stacked divided>
          <input
            className={d.field()}
            value={prefs.telegram}
            onChange={(e) => setPrefs({ ...prefs, telegram: e.target.value })}
            placeholder="@username"
            autoComplete="off"
          />
        </ProfileField>
        <ProfileField d={d} label="Сайт" hint="https://…" stacked divided>
          <input
            className={d.field()}
            value={prefs.website}
            onChange={(e) => setPrefs({ ...prefs, website: e.target.value })}
            placeholder="https://"
            autoComplete="url"
          />
        </ProfileField>
      </ProfileCard>
    </SettingsHubPanel>
  );
}
