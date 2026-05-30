import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { identityHasBlockingErrors } from "./profileIdentityValidation";
import { loadProfilePrefs, saveProfilePrefs, type UserProfilePrefs } from "./profilePrefs";
import { notifyProfilePrefsChanged } from "./useProfilePrefsSync";

export const VALIDATION_SAVE_MSG = "Исправьте Telegram или сайт перед сохранением.";

export type ProfilePrefsDraftOptions = {
  /** Debounce autosave, ms. 0 — только ручной commit. */
  autosaveMs?: number;
  /** Блокировать autosave при невалидных identity-полях. */
  blockOnIdentityErrors?: boolean;
  /** После успешного save (autosave или commit). */
  onAfterCommit?: (safe: UserProfilePrefs) => void;
};

/**
 * Единый паттерн: load → edit draft → autosave/commit → event bus.
 * ProfilePage — autosave; мессенджер — manual commit при «Сохранить».
 */
export function useProfilePrefsDraft(options: ProfilePrefsDraftOptions = {}) {
  const { autosaveMs = 0, blockOnIdentityErrors = false, onAfterCommit } = options;
  const onAfterCommitRef = useRef(onAfterCommit);
  onAfterCommitRef.current = onAfterCommit;

  const [prefs, setPrefs] = useState<UserProfilePrefs>(() => loadProfilePrefs());
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(loadProfilePrefs()));
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const autosaveReady = useRef(false);

  const isDirty = JSON.stringify(prefs) !== savedSnapshot;
  const validationBlocked = blockOnIdentityErrors && identityHasBlockingErrors(prefs);

  const reload = useCallback(() => {
    const loaded = loadProfilePrefs();
    setPrefs(loaded);
    setSavedSnapshot(JSON.stringify(loaded));
    setSaveError(null);
    return loaded;
  }, []);

  useEffect(() => {
    const refresh = () => {
      if (isDirty) return;
      reload();
    };
    window.addEventListener("retrogen-profile", refresh);
    return () => window.removeEventListener("retrogen-profile", refresh);
  }, [isDirty, reload]);

  const commit = useCallback(
    (next?: UserProfilePrefs) => {
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
      onAfterCommitRef.current?.(safe);
      return safe;
    },
    [prefs],
  );

  const discard = useCallback(() => {
    reload();
  }, [reload]);

  /** UI state после внешнего save (import backup и т.п.) — без повторной записи. */
  const replacePrefs = useCallback((next: UserProfilePrefs, hint?: string) => {
    setPrefs(next);
    setSavedSnapshot(JSON.stringify(next));
    setSaveError(null);
    if (hint) {
      setSavedHint(hint);
      window.setTimeout(() => setSavedHint(null), 2000);
    }
  }, []);

  const flashHint = useCallback((text: string) => {
    setSavedHint(text);
    window.setTimeout(() => setSavedHint(null), 2000);
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
    reload,
    replacePrefs,
    flashHint,
  };
}
