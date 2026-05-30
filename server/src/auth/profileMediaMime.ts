import path from "node:path";

export const MAX_PROFILE_MEDIA_BYTES = 900_000;

export type ProfileMediaKind = "avatar" | "wallpaper";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const ALLOWED_PROFILE_MEDIA_MIME = ALLOWED;

export function profileMediaApiPath(kind: ProfileMediaKind): string {
  return `/api/auth/me/profile/media/${kind}`;
}

export function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".jpg";
}

export function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === ".png") return "image/png";
  if (e === ".webp") return "image/webp";
  if (e === ".gif") return "image/gif";
  return "image/jpeg";
}

export function mimeFromPath(filePath: string): string {
  return mimeFromExt(path.extname(filePath));
}

export function normalizeProfileMediaMime(reported: string | undefined, filename: string): string | null {
  const lower = (reported ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (ALLOWED.has(lower)) return lower;
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return null;
}
