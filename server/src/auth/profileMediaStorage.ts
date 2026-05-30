import { getProfileMediaStore } from "../storage/profileMediaStoreFactory.js";
import {
  profileMediaApiPath,
  type ProfileMediaKind,
} from "./profileMediaMime.js";

export {
  extForMime,
  mimeFromExt,
  mimeFromPath,
  normalizeProfileMediaMime,
  MAX_PROFILE_MEDIA_BYTES,
  profileMediaApiPath,
  ALLOWED_PROFILE_MEDIA_MIME,
  type ProfileMediaKind,
} from "./profileMediaMime.js";

export async function saveProfileMediaFile(
  userId: string,
  kind: ProfileMediaKind,
  buffer: Buffer,
  mime: string,
): Promise<string> {
  await getProfileMediaStore().save(userId, kind, buffer, mime);
  return profileMediaApiPath(kind);
}

export async function readProfileMedia(userId: string, kind: ProfileMediaKind) {
  return getProfileMediaStore().read(userId, kind);
}

export async function deleteProfileMediaFile(userId: string, kind: ProfileMediaKind): Promise<void> {
  await getProfileMediaStore().delete(userId, kind);
}
