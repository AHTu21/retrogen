/** Cloud profile v1 — подмножество client `UserProfilePrefs` (без data URL). */

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
    cursorStyle: "default" | "crosshair" | "pointer" | "grab";
    wallpaperOpacity: number;
    profileAccent: string;
  };
  notifications: {
    retroEnded: boolean;
    weeklyDigest: boolean;
    productUpdates: boolean;
  };
  media: {
    avatarPath: string | null;
    wallpaperPath: string | null;
  };
};

const STR = (raw: unknown, max: number) =>
  typeof raw === "string" ? raw.trim().slice(0, max) : "";

const BOOL = (raw: unknown, fallback: boolean) => (typeof raw === "boolean" ? raw : fallback);

function normalizeCursor(raw: unknown): CloudProfileV1["room"]["cursorStyle"] {
  return raw === "crosshair" || raw === "pointer" || raw === "grab" ? raw : "default";
}

function normalizeOpacity(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return 40;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeNotifications(raw: unknown): CloudProfileV1["notifications"] {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    retroEnded: BOOL(o.retroEnded, true),
    weeklyDigest: BOOL(o.weeklyDigest, false),
    productUpdates: BOOL(o.productUpdates, false),
  };
}

function normalizeIdentity(raw: unknown): CloudProfileV1["identity"] {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    displayName: STR(o.displayName, 120),
    profileEmail: STR(o.profileEmail, 120),
    signature: STR(o.signature, 1000),
    roleTitle: STR(o.roleTitle, 60),
    teamName: STR(o.teamName, 80),
    pronouns: STR(o.pronouns, 40),
    city: STR(o.city, 60),
    timezone: STR(o.timezone, 64),
    telegram: STR(o.telegram, 32).replace(/^@+/, ""),
    website: STR(o.website, 200),
    contact: STR(o.contact, 40),
    emojiStatus: STR(o.emojiStatus, 8),
  };
}

function normalizeMedia(raw: unknown): CloudProfileV1["media"] {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const path = (v: unknown) => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    if (!t.startsWith("/api/auth/me/profile/media/")) return null;
    return t.slice(0, 120);
  };
  return {
    avatarPath: path(o.avatarPath),
    wallpaperPath: path(o.wallpaperPath),
  };
}

function normalizeRoom(raw: unknown): CloudProfileV1["room"] {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    boardBackdrop: STR(o.boardBackdrop, 32),
    headerTint: STR(o.headerTint, 32),
    cursorStyle: normalizeCursor(o.cursorStyle),
    wallpaperOpacity: normalizeOpacity(o.wallpaperOpacity),
    profileAccent: STR(o.profileAccent, 32),
  };
}

export function emptyCloudProfileV1(): CloudProfileV1 {
  const now = new Date().toISOString();
  return {
    v: 1,
    updatedAt: now,
    identity: normalizeIdentity({}),
    notepad: "",
    room: normalizeRoom({}),
    notifications: normalizeNotifications({}),
    media: normalizeMedia({}),
  };
}

export function parseCloudProfileV1(raw: unknown): CloudProfileV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return null;
  const updatedAt = typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString();
  return {
    v: 1,
    updatedAt,
    identity: normalizeIdentity(o.identity),
    notepad: STR(o.notepad, 50_000),
    room: normalizeRoom(o.room),
    notifications: normalizeNotifications(o.notifications),
    media: normalizeMedia(o.media),
  };
}

/** Partial PATCH body — только переданные поля мержатся. */
export type CloudProfilePatch = {
  identity?: Partial<CloudProfileV1["identity"]>;
  notepad?: string;
  room?: Partial<CloudProfileV1["room"]>;
  notifications?: Partial<CloudProfileV1["notifications"]>;
  media?: Partial<CloudProfileV1["media"]>;
};

export function mergeCloudProfilePatch(current: CloudProfileV1 | null, patch: CloudProfilePatch): CloudProfileV1 {
  const base = current ?? emptyCloudProfileV1();
  const next: CloudProfileV1 = {
    v: 1,
    updatedAt: new Date().toISOString(),
    identity: normalizeIdentity({ ...base.identity, ...patch.identity }),
    notepad: patch.notepad !== undefined ? STR(patch.notepad, 50_000) : base.notepad,
    room: normalizeRoom({ ...base.room, ...patch.room }),
    notifications: normalizeNotifications({ ...base.notifications, ...patch.notifications }),
    media: normalizeMedia({ ...base.media, ...patch.media }),
  };
  return next;
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
