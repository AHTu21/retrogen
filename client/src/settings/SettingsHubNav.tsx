import { useSettingsHub, useSettingsHubPrefs } from "./SettingsHubProvider";
import { settingsSectionsByGroup } from "./settingsHubRegistry";
import { settingsHubIcon } from "./settingsHubIcons";

export function SettingsHubNav() {
  const { section, setSection } = useSettingsHub();
  const { d } = useSettingsHubPrefs();
  const groups = settingsSectionsByGroup();

  return (
    <nav className="settings-hub-scroll flex h-full min-h-0 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Разделы настроек">
      {groups.map((group) => (
        <div key={group.groupLabel} className="min-w-0">
          <p className={d.navSection}>{group.groupLabel}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = section === item.id;
              const disabled = item.status === "soon";
              const cls = disabled ? d.navLocked : active ? d.navActive : d.navIdle;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    title={item.description}
                    className={`${cls} ${disabled ? "cursor-not-allowed" : ""}`}
                    onClick={() => !disabled && setSection(item.id)}
                    aria-current={active ? "page" : undefined}
                  >
                    {settingsHubIcon(item.id)}
                    <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
                    {disabled ? (
                      <span className={`ml-auto shrink-0 px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide ${d.rFull} ${d.badgeDone}`}>
                        скоро
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
