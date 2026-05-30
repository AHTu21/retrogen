import type { AuthUserDto } from "../api";
import type { UserProfilePrefs } from "./profilePrefs";
import { resolveProfileAvatarDisplay } from "./profileMediaCache";
import { displayHandle, displayNameWithStatus, initials } from "./profileUser";

/** Снимок identity текущего участника для комнаты. */
export type RoomActorProfile = {
  /** Plain name — стикеры, API, mentions */
  name: string;
  /** Label с emoji — UI */
  label: string;
  initials: string;
  avatarUrl: string | null;
  roleLine: string;
  signature: string;
};

export function resolveRoomActorRoleLine(prefs: UserProfilePrefs): string {
  return [prefs.roleTitle.trim(), prefs.teamName.trim()].filter(Boolean).join(" · ");
}

export function resolveRoomActorName(prefs: UserProfilePrefs, authMe: AuthUserDto | null): string {
  return displayHandle(prefs, authMe);
}

export function resolveRoomActorLabel(prefs: UserProfilePrefs, authMe: AuthUserDto | null): string {
  return displayNameWithStatus(prefs, authMe);
}

export function resolveRoomActorAvatar(prefs: UserProfilePrefs): string | null {
  return resolveProfileAvatarDisplay(prefs);
}

export function buildRoomActorProfile(prefs: UserProfilePrefs, authMe: AuthUserDto | null): RoomActorProfile {
  return {
    name: resolveRoomActorName(prefs, authMe),
    label: resolveRoomActorLabel(prefs, authMe),
    initials: initials(prefs, authMe),
    avatarUrl: resolveRoomActorAvatar(prefs),
    roleLine: resolveRoomActorRoleLine(prefs),
    signature: prefs.signature.trim(),
  };
}
