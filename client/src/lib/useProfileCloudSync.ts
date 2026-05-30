import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthUserDto } from "../api";
import {
  resolveProfileCloudConflict,
  type ConflictResolution,
  type ProfileCloudConflict,
} from "./profileCloudConflict";
import { prefetchProfileMedia } from "./profileMediaCache";
import type { UserProfilePrefs } from "./profilePrefs";
import { saveProfilePrefs } from "./profilePrefs";
import { loadCloudMeta, extractCloudProfile, type CloudProfileMeta } from "./profileCloudPayload";
import {
  formatCloudSyncLabel,
  pullCloudProfileIntoLocal,
  pushLocalProfileToCloud,
  type CloudSyncState,
} from "./profileCloudSync";
import { notifyProfilePrefsChanged } from "./useProfilePrefsSync";

const PUSH_DEBOUNCE_MS = 900;

export type UseProfileCloudSyncOptions = {
  authUser: AuthUserDto | null;
  prefs: UserProfilePrefs;
  isDirty: boolean;
  validationBlocked: boolean;
  onMergedFromCloud: (prefs: UserProfilePrefs, hint?: string) => void;
  onAuthUserUpdated: (user: AuthUserDto) => void;
};

export function useProfileCloudSync({
  authUser,
  prefs,
  isDirty,
  validationBlocked,
  onMergedFromCloud,
  onAuthUserUpdated,
}: UseProfileCloudSyncOptions) {
  const [state, setState] = useState<CloudSyncState>({ kind: "idle" });
  const [meta, setMeta] = useState<CloudProfileMeta>(() => loadCloudMeta());
  const [conflict, setConflict] = useState<ProfileCloudConflict | null>(null);
  const pulledForUser = useRef<string | null>(null);
  const pushTimer = useRef<number | null>(null);
  const lastPushedJson = useRef<string | null>(null);

  const refreshMeta = useCallback(() => setMeta(loadCloudMeta()), []);

  const pullOnce = useCallback(async () => {
    if (!authUser) return;
    setState({ kind: "pulling" });
    try {
      const result = await pullCloudProfileIntoLocal(authUser, prefs, isDirty);
      refreshMeta();
      if (result.kind === "conflict") {
        setConflict(result.conflict);
        setState({ kind: "idle" });
        return;
      }
      if (result.kind === "merged" && result.pulled) {
        onMergedFromCloud(result.prefs, "Подтянуто из облака");
      }
      setConflict(null);
      setState({ kind: "synced", at: new Date().toISOString() });
    } catch {
      setState({ kind: "error", message: "Не удалось загрузить профиль" });
    }
  }, [authUser, prefs, isDirty, onMergedFromCloud, refreshMeta]);

  useEffect(() => {
    if (!authUser) {
      pulledForUser.current = null;
      setConflict(null);
      setState({ kind: "idle" });
      return;
    }
    if (pulledForUser.current === authUser.id) return;
    pulledForUser.current = authUser.id;
    void pullOnce();
  }, [authUser, pullOnce]);

  useEffect(() => {
    if (!authUser) return;
    void prefetchProfileMedia(prefs);
  }, [authUser, prefs.avatarMediaPath, prefs.wallpaperMediaPath]);

  const schedulePush = useCallback(
    (safe: UserProfilePrefs) => {
      if (!authUser || validationBlocked) return;
      const cloudJson = JSON.stringify(extractCloudProfile(safe));
      if (cloudJson === lastPushedJson.current) return;

      if (pushTimer.current) window.clearTimeout(pushTimer.current);
      pushTimer.current = window.setTimeout(() => {
        pushTimer.current = null;
        setState({ kind: "pushing" });
        void pushLocalProfileToCloud(safe)
          .then((res) => {
            if (!res) return;
            lastPushedJson.current = cloudJson;
            onAuthUserUpdated(res.user);
            refreshMeta();
            setState({ kind: "synced", at: new Date().toISOString() });
          })
          .catch(() => {
            setState({ kind: "error", message: "Не удалось синхронизировать" });
          });
      }, PUSH_DEBOUNCE_MS);
    },
    [authUser, validationBlocked, onAuthUserUpdated, refreshMeta],
  );

  const resolveConflict = useCallback(
    (choice: ConflictResolution) => {
      if (!authUser || !conflict) return;
      const resolved = resolveProfileCloudConflict(prefs, conflict, choice, authUser.displayName);
      const { prefs: safe } = saveProfilePrefs(resolved);
      notifyProfilePrefsChanged();
      void prefetchProfileMedia(safe).then(() => {
        onMergedFromCloud(
          safe,
          choice === "server" ? "Версия с сервера" : choice === "merge" ? "Объединено" : "Ваши изменения",
        );
        setConflict(null);
        if (choice === "local" || choice === "merge") {
          schedulePush(safe);
        } else {
          lastPushedJson.current = JSON.stringify(extractCloudProfile(safe));
          refreshMeta();
        }
        setState({ kind: "synced", at: new Date().toISOString() });
      });
    },
    [authUser, conflict, prefs, onMergedFromCloud, schedulePush, refreshMeta],
  );

  useEffect(() => {
    return () => {
      if (pushTimer.current) window.clearTimeout(pushTimer.current);
    };
  }, []);

  const label = authUser ? formatCloudSyncLabel(state, meta) : null;

  return {
    cloudSyncState: state,
    cloudSyncMeta: meta,
    cloudSyncLabel: label,
    cloudConflict: conflict,
    scheduleCloudPush: schedulePush,
    retryCloudSync: pullOnce,
    resolveCloudConflict: resolveConflict,
  };
}
