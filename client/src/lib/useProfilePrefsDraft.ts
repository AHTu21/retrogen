import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { identityHasBlockingErrors } from "./profileIdentityValidation";
import { loadProfilePrefs, saveProfilePrefs, type UserProfilePrefs } from "./profilePrefs";
import { notifyProfilePrefsChanged } from "./useProfilePrefsSync";

const VALIDATION_SAVE_MSG = "Исправьте Telegram или сайт перед сохранением.";

export type ProfilePrefsDraftOptions = {
  /** Debounce autosave, ms. 0 — только ручной commit. */
  autosaveMs?: number;
  /** Блокировать autosave при невалидных identity-полях. */
  blockOnIdentityErrors?: boolean;
};

/**
 * Единый паттерн: load → edit draft → autosave → event bus.
 * Используется ProfilePage; мессенджер — позже (Фаза B).
 */
export function useProfilePrefsDraft(options: ProfilePrefsDraftOptions = {}) {
  const { autosaveMs = 0, blockOnIdentityErrors = false } = options;

  const [prefs, setPrefs] = useState<UserProfilePrefs>(() => loadProfilePrefs());
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(loadProfilePrefs()));
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const autosaveReady = useRef(false);

  const isDirty = JSON.stringify(prefs) !== savedSnapshot;
  const validationBlocked = blockOnIdentityErrors && identityHasBlockingErrors(prefs);

  useEffect(() => {
    const refresh = () => {
      if (isDirty) return;
      const loaded = loadProfilePrefs();
      setPrefs(loaded);
      setSavedSnapshot(JSON.stringify(loaded));
    };
    window.addEventListener("retrogen-profile", refresh);
    return () => window.removeEventListener("retrogen-profile", refresh);
  }, [isDirty]);

  const commit = useCallback((next?: UserProfilePrefs) => {
    const payload = next ?? prefs;
    const { prefs: safe, error } = saveProfilePrefs(payload);
    setPrefs(safe);
    setSavedSnapshot(JSON.stringify(safe));
    notifyProfilePrefsChanged();
    if (error === "quota") {
      setSaveError("Недостаточно места в браузере — уменьшите обои или аватар.");
      setSavedHint(null);
      return safe;
    }
    setSaveError(null);
    setSavedHint("Сохранено");
    window.setTimeout(() => setSavedHint(null), 2000);
    return safe;
  }, [prefs]);

  const discard = useCallback(() => {
    const loaded = loadProfilePrefs();
    setPrefs(loaded);
    setSavedSnapshot(JSON.stringify(loaded));
    setSaveError(null);
  }, []);

  useEffect(() => {
    if (!autosaveMs) return;
    if (!autosaveReady.current) {
      autosaveReady.current = true;
      return;
    }
    if (!isDirty) return;
    if (validationBlocked) {
      setSaveError(VALIDATION_SAVE_MSG);
      return;
    }
    setSaveError((e) => (e === VALIDATION_SAVE_MSG ? null : e));
    const timer = window.setTimeout(() => commit(), autosaveMs);
    return () => window.clearTimeout(timer);
  }, [prefs, isDirty, validationBlocked, autosaveMs, commit]);

  const saveStatus = useMemo(() => {
    if (savedHint) return { kind: "saved" as const, text: savedHint };
    if (!isDirty) return null;
    if (validationBlocked) return { kind: "blocked" as const, text: "Не сохранено — проверьте поля" };
    if (autosaveMs) return { kind: "pending" as const, text: "Сохранение…" };
    return { kind: "dirty" as const, text: "Есть изменения" };
  }, [savedHint, isDirty, validationBlocked, autosaveMs]);

  return {
    prefs,
    setPrefs,
    isDirty,
    validationBlocked,
    savedHint,
    saveError,
    setSaveError,
    saveStatus,
    commit,
    discard,
  };
}

export { VALIDATION_SAVE_MSG };
