import { useCallback, useEffect, useState } from "react";
import { prefetchProfileMedia } from "./profileMediaCache";
import { loadProfilePrefs, saveProfilePrefs, type UserProfilePrefs } from "./profilePrefs";

export function notifyProfilePrefsChanged() {
  window.dispatchEvent(new CustomEvent("retrogen-profile"));
}

export function useProfilePrefsSync() {
  const [prefs, setPrefs] = useState<UserProfilePrefs>(() => loadProfilePrefs());

  const refresh = useCallback(() => {
    const loaded = loadProfilePrefs();
    setPrefs(loaded);
    void prefetchProfileMedia(loaded);
  }, []);

  useEffect(() => {
    void prefetchProfileMedia(prefs);
  }, [prefs.avatarMediaPath, prefs.wallpaperMediaPath]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "retrogen_profile_v1") refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("retrogen-profile", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("retrogen-profile", refresh);
    };
  }, [refresh]);

  const commit = useCallback((next: UserProfilePrefs) => {
    const { prefs: saved } = saveProfilePrefs(next);
    setPrefs(saved);
    notifyProfilePrefsChanged();
    return saved;
  }, []);

  return { prefs, setPrefs, refresh, commit };
}
