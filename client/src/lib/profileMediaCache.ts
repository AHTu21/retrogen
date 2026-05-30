import { apiFetch } from "../api";
import type { UserProfilePrefs } from "./profilePrefs";
import { effectiveBoardWallpaper } from "./profilePrefs";

const objectUrls = new Map<string, string>();

export function getCachedProfileMediaUrl(apiPath: string | null | undefined): string | null {
  if (!apiPath) return null;
  return objectUrls.get(apiPath) ?? null;
}

export function seedProfileMediaCache(apiPath: string, objectUrl: string): void {
  const prev = objectUrls.get(apiPath);
  if (prev && prev !== objectUrl) URL.revokeObjectURL(prev);
  objectUrls.set(apiPath, objectUrl);
}

export async function fetchProfileMediaObjectUrl(apiPath: string): Promise<string | null> {
  const cached = getCachedProfileMediaUrl(apiPath);
  if (cached) return cached;
  const res = await apiFetch(apiPath);
  if (!res.ok) return null;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  objectUrls.set(apiPath, url);
  return url;
}

export async function prefetchProfileMedia(
  prefs: Pick<UserProfilePrefs, "avatarMediaPath" | "wallpaperMediaPath">,
): Promise<void> {
  await Promise.all([
    prefs.avatarMediaPath ? fetchProfileMediaObjectUrl(prefs.avatarMediaPath) : null,
    prefs.wallpaperMediaPath ? fetchProfileMediaObjectUrl(prefs.wallpaperMediaPath) : null,
  ]);
}

export function resolveProfileAvatarDisplay(prefs: UserProfilePrefs): string | null {
  const local = prefs.avatarDataUrl?.trim();
  if (local) return local;
  return getCachedProfileMediaUrl(prefs.avatarMediaPath);
}

export function resolveProfileWallpaperDisplay(
  prefs: Pick<UserProfilePrefs, "wallpaperDataUrl" | "avatarDataUrl" | "wallpaperMediaPath">,
): string | null {
  const local = effectiveBoardWallpaper(prefs);
  if (local) return local;
  return getCachedProfileMediaUrl(prefs.wallpaperMediaPath);
}

export function profileHasAvatar(prefs: UserProfilePrefs): boolean {
  return !!(prefs.avatarDataUrl?.trim() || prefs.avatarMediaPath);
}
