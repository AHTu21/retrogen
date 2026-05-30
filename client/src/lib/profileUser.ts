import type { AuthUserDto } from "../api";
import type { UserProfilePrefs } from "./profilePrefs";

/** Plain display name — для API, authorDisplayName, @mentions (без emoji). */
export function displayHandle(prefs: UserProfilePrefs, authUser: AuthUserDto | null) {
  if (prefs.displayName.trim()) return prefs.displayName.trim();
  if (authUser?.displayName?.trim()) return authUser.displayName.trim();
  if (authUser?.email) return authUser.email.split("@")[0] ?? "user";
  return "Гость";
}

/** Имя с emoji-статусом — для UI (шапка, sidebar, обзор). */
export function displayNameWithStatus(prefs: UserProfilePrefs, authUser: AuthUserDto | null) {
  const name = displayHandle(prefs, authUser);
  const emoji = prefs.emojiStatus.trim();
  return emoji ? `${emoji} ${name}` : name;
}

export function initials(prefs: UserProfilePrefs, authUser: AuthUserDto | null) {
  const name = displayHandle(prefs, authUser);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}
