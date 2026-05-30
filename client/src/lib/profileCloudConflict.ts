import type { CloudProfileMeta, CloudProfileV1 } from "./profileCloudPayload";
import { applyCloudProfileToPrefs, cloudProfilesEqual, extractCloudProfile } from "./profileCloudPayload";
import type { UserProfilePrefs } from "./profilePrefs";

export type ProfileCloudConflict = {
  server: CloudProfileV1;
  local: CloudProfileV1;
  serverUpdatedAt: string;
};

export type ConflictResolution = "local" | "server" | "merge";

/** Конфликт: локальный черновик расходится с более новым сервером. */
export function detectProfileCloudConflict(
  localPrefs: UserProfilePrefs,
  server: CloudProfileV1,
  meta: CloudProfileMeta,
  isDirty: boolean,
): ProfileCloudConflict | null {
  if (!isDirty) return null;

  const localCloud = extractCloudProfile(localPrefs);
  if (cloudProfilesEqual(localCloud, server)) return null;

  const lastSync = meta.lastPulledAt ?? meta.lastPushedAt;
  const serverNewer = !lastSync || server.updatedAt > lastSync;
  if (!serverNewer) return null;

  return {
    server,
    local: localCloud,
    serverUpdatedAt: server.updatedAt,
  };
}

export function resolveProfileCloudConflict(
  localPrefs: UserProfilePrefs,
  conflict: ProfileCloudConflict,
  choice: ConflictResolution,
  authDisplayName?: string,
): UserProfilePrefs {
  if (choice === "server") {
    return applyCloudProfileToPrefs(localPrefs, conflict.server, authDisplayName);
  }

  if (choice === "local") {
    return { ...localPrefs };
  }

  const serverWinsText = conflict.server.updatedAt >= (conflict.local.updatedAt ?? "");
  const merged = serverWinsText
    ? applyCloudProfileToPrefs(localPrefs, conflict.server, authDisplayName)
    : { ...localPrefs };

  const media = conflict.server.media ?? { avatarPath: null, wallpaperPath: null };
  return {
    ...merged,
    avatarDataUrl: media.avatarPath ? null : localPrefs.avatarDataUrl,
    avatarMediaPath: media.avatarPath ?? localPrefs.avatarMediaPath,
    wallpaperDataUrl: media.wallpaperPath ? null : localPrefs.wallpaperDataUrl,
    wallpaperMediaPath: media.wallpaperPath ?? localPrefs.wallpaperMediaPath,
  };
}
