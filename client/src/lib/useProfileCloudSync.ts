import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthUserDto } from "../api";
import type { UserProfilePrefs } from "./profilePrefs";
import { loadCloudMeta, extractCloudProfile, type CloudProfileMeta } from "./profileCloudPayload";
import {
  formatCloudSyncLabel,
  pullCloudProfileIntoLocal,
  pushLocalProfileToCloud,
  type CloudSyncState,
} from "./profileCloudSync";

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
  const pulledForUser = useRef<string | null>(null);
  const pushTimer = useRef<number | null>(null);
  const lastPushedJson = useRef<string | null>(null);

  const refreshMeta = useCallback(() => setMeta(loadCloudMeta()), []);

  const pullOnce = useCallback(async () => {
    if (!authUser) return;
    setState({ kind: "pulling" });
    try {
      const { prefs: merged, pulled } = await pullCloudProfileIntoLocal(authUser, prefs);
      refreshMeta();
      if (pulled) {
        onMergedFromCloud(merged, "Подтянуто из облака");
      }
      setState({ kind: "synced", at: new Date().toISOString() });
    } catch {
      setState({ kind: "error", message: "Не удалось загрузить профиль" });
    }
  }, [authUser, prefs, onMergedFromCloud, refreshMeta]);

  useEffect(() => {
    if (!authUser) {
      pulledForUser.current = null;
      setState({ kind: "idle" });
      return;
    }
    if (pulledForUser.current === authUser.id) return;
    if (isDirty) return;
    pulledForUser.current = authUser.id;
    void pullOnce();
  }, [authUser, isDirty, pullOnce]);

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
    scheduleCloudPush: schedulePush,
    retryCloudSync: pullOnce,
  };
}
