import type { AuthUserDto } from "../api";
import { fetchAuthProfile, patchAuthProfile } from "../api";
import {
  detectProfileCloudConflict,
  type ProfileCloudConflict,
} from "./profileCloudConflict";
import type { UserProfilePrefs } from "./profilePrefs";
import { saveProfilePrefs } from "./profilePrefs";
import { prefetchProfileMedia } from "./profileMediaCache";
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

export type PullCloudResult =
  | { kind: "merged"; prefs: UserProfilePrefs; pulled: boolean }
  | { kind: "conflict"; conflict: ProfileCloudConflict; prefs: UserProfilePrefs }
  | { kind: "noop"; prefs: UserProfilePrefs };

export async function pullCloudProfileIntoLocal(
  authUser: AuthUserDto,
  local: UserProfilePrefs,
  isDirty: boolean,
): Promise<PullCloudResult> {
  const remote = await fetchAuthProfile();
  const now = new Date().toISOString();
  const meta = loadCloudMeta();

  if (!remote) {
    return { kind: "noop", prefs: local };
  }

  if (!remote.profile) {
    if (cloudProfileHasContent(extractCloudProfile(local))) {
      await pushLocalProfileToCloud(local);
    }
    saveCloudMeta({ lastPulledAt: now, serverUpdatedAt: null });
    return { kind: "noop", prefs: local };
  }

  const server = normalizeCloudProfileFromApi(remote.profile);
  const conflict = detectProfileCloudConflict(local, server, meta, isDirty);
  if (conflict) {
    return { kind: "conflict", conflict, prefs: local };
  }

  const merged = applyCloudProfileToPrefs(local, server, authUser.displayName);
  const { prefs: safe } = saveProfilePrefs(merged);
  notifyProfilePrefsChanged();
  await prefetchProfileMedia(safe);
  saveCloudMeta({ lastPulledAt: now, serverUpdatedAt: remote.profile.updatedAt });
  return { kind: "merged", prefs: safe, pulled: true };
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
