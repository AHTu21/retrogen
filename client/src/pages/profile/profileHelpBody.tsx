import { PROFILE_HELP, PROFILE_HELP_GENERAL } from "./profileHelpContent";
import type { ProfileSectionId } from "./profileHubTheme";

/** Тело окна RetrogenDockableHelp — общая + текущий раздел. */
export function buildProfileHelpBody(
  section: ProfileSectionId,
  hideTips: boolean,
  onHideTipsChange: (hidden: boolean) => void,
) {
  const sectionEntry = PROFILE_HELP[section] ?? PROFILE_HELP_GENERAL;

  return (
    <>
      <p className="opacity-90">{PROFILE_HELP_GENERAL.summary}</p>
      <ul className="mt-3 space-y-1.5 text-[0.8125rem] opacity-90">
        {PROFILE_HELP_GENERAL.bullets.slice(0, 2).map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>

      <h3 className="mt-4 text-[0.875rem] font-semibold">{sectionEntry.title}</h3>
      <p className="mt-1 text-[0.8125rem] opacity-90">{sectionEntry.summary}</p>
      <ul className="mt-2 space-y-1.5 text-[0.8125rem] opacity-90">
        {sectionEntry.bullets.map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>

      <p className="mt-4 text-[0.8125rem] opacity-75">
        Навигация: Alt+↑/↓ между разделами. Экспорт JSON — в «Безопасность».
      </p>

      <label className="mt-4 flex cursor-pointer items-start gap-2 border-t border-current/15 pt-3 text-[0.8125rem] opacity-90">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0"
          checked={hideTips}
          onChange={(e) => onHideTipsChange(e.target.checked)}
        />
        <span>Скрыть подсказки на кнопках — я уже знаком с профилем</span>
      </label>
    </>
  );
}

export function profileHelpTitle(section: ProfileSectionId): string {
  const entry = PROFILE_HELP[section];
  return entry ? `Справка: ${entry.title}` : "Справка: профиль";
}
