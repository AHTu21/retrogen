import type { AuthUserDto } from "../api";
import { fetchAuthProfile, patchAuthProfile } from "../api";
import type { UserProfilePrefs } from "./profilePrefs";
import { saveProfilePrefs } from "./profilePrefs";
import {
  applyCloudProfileToPrefs,
  cloudProfileHasContent,
  cloudProfilePatchFromPrefs,
  extractCloudProfile,
  loadCloudMeta,
  normalizeCloudProfileFromApi,
  saveCloudMeta,
  type CloudProfileV1,
} from "./profileCloudPayload";
import { notifyProfilePrefsChanged } from "./useProfilePrefsSync";

export type CloudSyncState =
  | { kind: "idle" }
  | { kind: "pulling" }
  | { kind: "pushing" }
  | { kind: "synced"; at: string }
  | { kind: "error"; message: string };

export async function pullCloudProfileIntoLocal(
  authUser: AuthUserDto,
  local: UserProfilePrefs,
): Promise<{ prefs: UserProfilePrefs; pulled: boolean }> {
  const remote = await fetchAuthProfile();
  const now = new Date().toISOString();

  if (!remote) {
    return { prefs: local, pulled: false };
  }

  if (!remote.profile) {
    if (cloudProfileHasContent(extractCloudProfile(local))) {
      await pushLocalProfileToCloud(local);
    }
    saveCloudMeta({ lastPulledAt: now, serverUpdatedAt: null });
    return { prefs: local, pulled: false };
  }

  const merged = applyCloudProfileToPrefs(local, normalizeCloudProfileFromApi(remote.profile), authUser.displayName);
  const { prefs: safe } = saveProfilePrefs(merged);
  notifyProfilePrefsChanged();
  saveCloudMeta({ lastPulledAt: now, serverUpdatedAt: remote.profile.updatedAt });
  return { prefs: safe, pulled: true };
}

export async function pushLocalProfileToCloud(
  prefs: UserProfilePrefs,
): Promise<{ profile: CloudProfileV1 | null; user: AuthUserDto } | null> {
  const patch = cloudProfilePatchFromPrefs(prefs);
  const res = await patchAuthProfile(patch);
  const now = new Date().toISOString();
  saveCloudMeta({
    lastPushedAt: now,
    serverUpdatedAt: res.profile?.updatedAt ?? now,
  });
  return {
    profile: res.profile ? normalizeCloudProfileFromApi(res.profile) : null,
    user: res.user,
  };
}

export function formatCloudSyncLabel(state: CloudSyncState, meta = loadCloudMeta()): string | null {
  if (state.kind === "pulling") return "Загрузка из облака…";
  if (state.kind === "pushing") return "Синхронизация…";
  if (state.kind === "error") return state.message;
  if (state.kind === "synced") return "Синхронизировано";
  if (meta.lastPushedAt || meta.serverUpdatedAt) return "В облаке";
  return null;
}
