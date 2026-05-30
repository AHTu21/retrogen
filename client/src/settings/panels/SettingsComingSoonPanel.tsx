import { useSettingsHubPrefs } from "../SettingsHubProvider";
import { SettingsHubLink, SettingsHubPanel, SettingsHubSectionHeader } from "../settingsHubUi";

export function SettingsComingSoonPanel() {
  const { d } = useSettingsHubPrefs();

  return (
    <SettingsHubPanel>
      <SettingsHubSectionHeader sectionId="workshop" d={d} />
      <div className={`${d.insetGroup} px-6 py-10 text-center`}>
        <p className={`text-[0.9375rem] leading-relaxed ${d.muted}`}>Раздел в разработке.</p>
        <SettingsHubLink to="/workshop" className={`mt-4 inline-flex ${d.btnPrimary}`}>
          Открыть мастерскую
        </SettingsHubLink>
      </div>
    </SettingsHubPanel>
  );
}
