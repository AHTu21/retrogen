/** UI-предпочтения профиля: подсказки для новичков vs «профи». */

const KEY = "retrogen_profile_ui_v1";

export type ProfileUiPrefs = {
  /** Скрыть подсказки на кнопках и не открывать справку автоматически */
  hideTips: boolean;
};

const DEFAULT: ProfileUiPrefs = { hideTips: false };

export function loadProfileUiPrefs(): ProfileUiPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const p = JSON.parse(raw) as Partial<ProfileUiPrefs>;
    return { hideTips: p.hideTips === true };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveProfileUiPrefs(prefs: ProfileUiPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* quota */
  }
}

export function setProfileTipsHidden(hidden: boolean): ProfileUiPrefs {
  const next = { hideTips: hidden };
  saveProfileUiPrefs(next);
  return next;
}
