import type { UserProfilePrefs } from "./profilePrefs";
import { normalizeProfileNotifications } from "./profileNotificationPrefs";
import { normalizeWallpaperOpacity } from "./profilePrefs";

/** Cloud profile v1 — совпадает с server `CloudProfileV1`. */
export type CloudProfileV1 = {
  v: 1;
  updatedAt: string;
  identity: {
    displayName: string;
    profileEmail: string;
    signature: string;
    roleTitle: string;
    teamName: string;
    pronouns: string;
    city: string;
    timezone: string;
    telegram: string;
    website: string;
    contact: string;
    emojiStatus: string;
  };
  notepad: string;
  room: {
    boardBackdrop: string;
    headerTint: string;
    cursorStyle: UserProfilePrefs["cursorStyle"];
    wallpaperOpacity: number;
    profileAccent: string;
  };
  notifications: UserProfilePrefs["notifications"];
  media: {
    avatarPath: string | null;
    wallpaperPath: string | null;
  };
};

const emptyMedia = (): CloudProfileV1["media"] => ({ avatarPath: null, wallpaperPath: null });

export type CloudProfilePatch = {
  identity?: Partial<CloudProfileV1["identity"]>;
  notepad?: string;
  room?: Partial<CloudProfileV1["room"]>;
  notifications?: Partial<CloudProfileV1["notifications"]>;
  media?: Partial<CloudProfileV1["media"]>;
};

/** Поля, которые уходят в облако (avatar/wallpaper data URL — только локально). */
export function extractCloudProfile(prefs: UserProfilePrefs): CloudProfileV1 {
  return {
    v: 1,
    updatedAt: new Date().toISOString(),
    identity: {
      displayName: prefs.displayName.trim(),
      profileEmail: prefs.profileEmail.trim(),
      signature: prefs.signature,
      roleTitle: prefs.roleTitle,
      teamName: prefs.teamName,
      pronouns: prefs.pronouns,
      city: prefs.city,
      timezone: prefs.timezone,
      telegram: prefs.telegram,
      website: prefs.website,
      contact: prefs.contact,
      emojiStatus: prefs.emojiStatus,
    },
    notepad: prefs.notepad,
    room: {
      boardBackdrop: prefs.boardBackdrop,
      headerTint: prefs.headerTint,
      cursorStyle: prefs.cursorStyle,
      wallpaperOpacity: prefs.wallpaperOpacity,
      profileAccent: prefs.profileAccent,
    },
    notifications: { ...prefs.notifications },
    media: {
      avatarPath: prefs.avatarMediaPath,
      wallpaperPath: prefs.wallpaperMediaPath,
    },
  };
}

export function cloudProfilePatchFromPrefs(prefs: UserProfilePrefs): CloudProfilePatch {
  const c = extractCloudProfile(prefs);
  return {
    identity: c.identity,
    notepad: c.notepad,
    room: c.room,
    notifications: c.notifications,
    media: c.media,
  };
}

export function applyCloudProfileToPrefs(
  local: UserProfilePrefs,
  cloud: CloudProfileV1,
  authDisplayName?: string,
): UserProfilePrefs {
  const id = cloud.identity;
  const media = cloud.media ?? emptyMedia();
  return {
    ...local,
    displayName: id.displayName || authDisplayName?.trim() || local.displayName,
    profileEmail: id.profileEmail,
    signature: id.signature,
    roleTitle: id.roleTitle,
    teamName: id.teamName,
    pronouns: id.pronouns,
    city: id.city,
    timezone: id.timezone,
    telegram: id.telegram,
    website: id.website,
    contact: id.contact,
    emojiStatus: id.emojiStatus,
    notepad: cloud.notepad,
    boardBackdrop: cloud.room.boardBackdrop,
    headerTint: cloud.room.headerTint,
    cursorStyle:
      cloud.room.cursorStyle === "crosshair" ||
      cloud.room.cursorStyle === "pointer" ||
      cloud.room.cursorStyle === "grab"
        ? cloud.room.cursorStyle
        : local.cursorStyle,
    wallpaperOpacity: normalizeWallpaperOpacity(cloud.room.wallpaperOpacity),
    profileAccent: cloud.room.profileAccent,
    notifications: normalizeProfileNotifications(cloud.notifications),
    avatarMediaPath: media.avatarPath,
    wallpaperMediaPath: media.wallpaperPath,
    avatarDataUrl: media.avatarPath ? null : local.avatarDataUrl,
    wallpaperDataUrl: media.wallpaperPath ? null : local.wallpaperDataUrl,
  };
}

function normalizeCursorStyle(raw: string): UserProfilePrefs["cursorStyle"] {
  return raw === "crosshair" || raw === "pointer" || raw === "grab" ? raw : "default";
}

function normalizeMediaFromApi(raw: { avatarPath?: string | null; wallpaperPath?: string | null } | undefined) {
  if (!raw) return emptyMedia();
  const path = (v: unknown) => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.startsWith("/api/auth/me/profile/media/") ? t : null;
  };
  return { avatarPath: path(raw.avatarPath), wallpaperPath: path(raw.wallpaperPath) };
}

/** Нормализует ответ API в локальный CloudProfileV1. */
export function normalizeCloudProfileFromApi(
  raw: import("../api").CloudProfileV1Dto,
): CloudProfileV1 {
  return {
    ...raw,
    room: {
      ...raw.room,
      cursorStyle: normalizeCursorStyle(raw.room.cursorStyle),
    },
    media: normalizeMediaFromApi(raw.media),
  };
}

export function cloudProfileHasContent(p: CloudProfileV1): boolean {
  const id = p.identity;
  return !!(
    id.displayName ||
    id.profileEmail ||
    id.signature ||
    id.roleTitle ||
    id.teamName ||
    id.emojiStatus ||
    p.notepad.trim() ||
    p.room.boardBackdrop ||
    p.room.headerTint ||
    p.media.avatarPath ||
    p.media.wallpaperPath ||
    p.notifications.weeklyDigest ||
    p.notifications.productUpdates
  );
}

export function cloudProfilesEqual(a: CloudProfileV1, b: CloudProfileV1): boolean {
  return JSON.stringify(stripUpdatedAt(a)) === JSON.stringify(stripUpdatedAt(b));
}

function stripUpdatedAt(p: CloudProfileV1): Omit<CloudProfileV1, "updatedAt"> & { updatedAt?: string } {
  const { updatedAt: _u, ...rest } = p;
  return rest;
}

export const CLOUD_META_KEY = "retrogen_profile_cloud_meta_v1";

export type CloudProfileMeta = {
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  serverUpdatedAt: string | null;
};

export function loadCloudMeta(): CloudProfileMeta {
  try {
    const raw = localStorage.getItem(CLOUD_META_KEY);
    if (!raw) return { lastPulledAt: null, lastPushedAt: null, serverUpdatedAt: null };
    const o = JSON.parse(raw) as Partial<CloudProfileMeta>;
    return {
      lastPulledAt: typeof o.lastPulledAt === "string" ? o.lastPulledAt : null,
      lastPushedAt: typeof o.lastPushedAt === "string" ? o.lastPushedAt : null,
      serverUpdatedAt: typeof o.serverUpdatedAt === "string" ? o.serverUpdatedAt : null,
    };
  } catch {
    return { lastPulledAt: null, lastPushedAt: null, serverUpdatedAt: null };
  }
}

export function saveCloudMeta(patch: Partial<CloudProfileMeta>): CloudProfileMeta {
  const next = { ...loadCloudMeta(), ...patch };
  try {
    localStorage.setItem(CLOUD_META_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
