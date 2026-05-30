import { ProfileRoomPanel } from "../../pages/profile/ProfileRoomPanel";
import { useSettingsHubPrefs } from "../SettingsHubProvider";
import { SettingsHubFootnote, SettingsHubLink, SettingsHubPanel, SettingsHubSectionHeader } from "../settingsHubUi";

export function SettingsBoardPanel() {
  const { d, prefs, setPrefs, wallpaperSrc, onWallpaperFile, onWallpaperClear } = useSettingsHubPrefs();

  return (
    <SettingsHubPanel wide>
      <SettingsHubSectionHeader sectionId="board" d={d} />

      <div className="space-y-6">
        <ProfileRoomPanel
          d={d}
          prefs={prefs}
          setPrefs={setPrefs}
          onWallpaperFile={onWallpaperFile}
          onWallpaperClear={onWallpaperClear}
          wallpaperSrc={wallpaperSrc}
        />

        <SettingsHubFootnote d={d}>
          Полная версия с превью — в{" "}
          <SettingsHubLink to="/profile#room" className={d.link}>
            профиле → Оформление доски
          </SettingsHubLink>
          .
        </SettingsHubFootnote>
      </div>
    </SettingsHubPanel>
  );
}
