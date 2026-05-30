import { loadProfilePrefs, saveProfilePrefs, type UserProfilePrefs } from "./profilePrefs";
import { notifyProfilePrefsChanged } from "./useProfilePrefsSync";
import {
  getFavoriteSlugs,
  getVisitedRooms,
  restoreFavoriteSlugs,
  restoreVisitedRooms,
  type VisitedRoomEntry,
} from "./roomLobbyPrefs";

export const PROFILE_BACKUP_VERSION = 1 as const;

export type ProfileBackupV1 = {
  version: typeof PROFILE_BACKUP_VERSION;
  exportedAt: string;
  app: "retrogen";
  profile: UserProfilePrefs;
  visitedRooms?: VisitedRoomEntry[];
  favoriteSlugs?: string[];
};

export function buildProfileBackup(): ProfileBackupV1 {
  return {
    version: PROFILE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: "retrogen",
    profile: loadProfilePrefs(),
    visitedRooms: getVisitedRooms(),
    favoriteSlugs: getFavoriteSlugs(),
  };
}

export function parseProfileBackup(raw: unknown): ProfileBackupV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.app !== "retrogen" || o.version !== PROFILE_BACKUP_VERSION) return null;
  if (!o.profile || typeof o.profile !== "object") return null;
  return {
    version: PROFILE_BACKUP_VERSION,
    exportedAt: typeof o.exportedAt === "string" ? o.exportedAt : new Date().toISOString(),
    app: "retrogen",
    profile: o.profile as UserProfilePrefs,
    visitedRooms: Array.isArray(o.visitedRooms) ? (o.visitedRooms as ProfileBackupV1["visitedRooms"]) : undefined,
    favoriteSlugs: Array.isArray(o.favoriteSlugs)
      ? o.favoriteSlugs.filter((x): x is string => typeof x === "string")
      : undefined,
  };
}

export function downloadProfileBackup(): void {
  const backup = buildProfileBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = backup.exportedAt.slice(0, 10);
  a.href = url;
  a.download = `retrogen-profile-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function applyProfileBackup(backup: ProfileBackupV1): UserProfilePrefs {
  saveProfilePrefs(backup.profile);
  if (backup.visitedRooms?.length) restoreVisitedRooms(backup.visitedRooms);
  if (backup.favoriteSlugs?.length) restoreFavoriteSlugs(backup.favoriteSlugs);
  notifyProfilePrefsChanged();
  return loadProfilePrefs();
}
