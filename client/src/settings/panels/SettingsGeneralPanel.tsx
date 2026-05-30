import { ThemeCornersIconButtons } from "../../components/ThemeCornersIconButtons";
import { loadProfileUiPrefs, saveProfileUiPrefs } from "../../lib/profileHelpPrefs";
import { ProfileCard, ProfileToggleRow } from "../../pages/profile/profileUi";
import { useCallback, useState } from "react";
import { useSettingsHubPrefs } from "../SettingsHubProvider";
import {
  SettingsHubFootnote,
  SettingsHubKbd,
  SettingsHubPanel,
  SettingsHubSectionHeader,
} from "../settingsHubUi";

export function SettingsGeneralPanel() {
  const { d, isLight, cornerMode, toggleTheme, toggleCorners } = useSettingsHubPrefs();
  const [hideTips, setHideTips] = useState(() => loadProfileUiPrefs().hideTips);

  const onHideTips = useCallback((next: boolean) => {
    setHideTips(next);
    saveProfileUiPrefs({ hideTips: next });
    window.dispatchEvent(new CustomEvent("retrogen-profile-ui"));
  }, []);

  return (
    <SettingsHubPanel>
      <SettingsHubSectionHeader sectionId="general" d={d} />

      <div className="space-y-6">
        <ProfileCard d={d} title="Внешний вид" description="Тема и форма углов во всём приложении">
          <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-medium text-[var(--ph-text)]">Тема интерфейса</p>
              <p className={`mt-0.5 text-[0.75rem] leading-relaxed ${d.muted}`}>
                {isLight ? "Светлая" : "Тёмная"} · {cornerMode === "rounded" ? "скруглённые" : "острые"} углы
              </p>
            </div>
            <div className={`flex shrink-0 items-center gap-1.5 ${d.rSm} bg-[var(--ph-setting-tray)] p-1.5 ring-1 ring-[var(--ph-border)]`}>
              <ThemeCornersIconButtons
                isLight={isLight}
                isRounded={cornerMode === "rounded"}
                toggleTheme={toggleTheme}
                toggleCorners={toggleCorners}
              />
            </div>
          </div>
        </ProfileCard>

        <ProfileCard d={d} title="Подсказки" description="Справка и title на кнопках">
          <ProfileToggleRow
            d={d}
            label="Скрыть подсказки на кнопках"
            hint="Режим «профи» — без всплывающих подсказок"
            checked={hideTips}
            onChange={onHideTips}
          />
        </ProfileCard>

        <SettingsHubFootnote d={d}>
          Горячая клавиша: <SettingsHubKbd>Ctrl</SettingsHubKbd> + <SettingsHubKbd>,</SettingsHubKbd> — открыть или закрыть
          настройки.
        </SettingsHubFootnote>
      </div>
    </SettingsHubPanel>
  );
}
