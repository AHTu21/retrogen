import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROFILE_MEDIA_ROOT = path.resolve(__dirname, "../../data/profile-media");

export const MAX_PROFILE_MEDIA_BYTES = 900_000;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type ProfileMediaKind = "avatar" | "wallpaper";

export function profileMediaApiPath(kind: ProfileMediaKind): string {
  return `/api/auth/me/profile/media/${kind}`;
}

export function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".jpg";
}

export function normalizeProfileMediaMime(reported: string | undefined, filename: string): string | null {
  const lower = (reported ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (ALLOWED_MIME.has(lower)) return lower;
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return null;
}

export async function saveProfileMediaFile(
  userId: string,
  kind: ProfileMediaKind,
  buffer: Buffer,
  mime: string,
): Promise<string> {
  const dir = path.join(PROFILE_MEDIA_ROOT, userId);
  await fs.mkdir(dir, { recursive: true });
  const ext = extForMime(mime);
  const fileName = `${kind}${ext}`;
  const fullPath = path.join(dir, fileName);
  await fs.writeFile(fullPath, buffer);
  return profileMediaApiPath(kind);
}

export function resolveProfileMediaPath(userId: string, kind: ProfileMediaKind): string | null {
  const dir = path.join(PROFILE_MEDIA_ROOT, userId);
  for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
    const candidate = path.join(dir, `${kind}${ext}`);
    try {
      if (candidate.startsWith(PROFILE_MEDIA_ROOT)) return candidate;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export async function findProfileMediaFile(userId: string, kind: ProfileMediaKind): Promise<string | null> {
  const dir = path.join(PROFILE_MEDIA_ROOT, userId);
  for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
    const candidate = path.join(dir, `${kind}${ext}`);
    try {
      await fs.access(candidate);
      if (candidate.startsWith(PROFILE_MEDIA_ROOT)) return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function deleteProfileMediaFile(userId: string, kind: ProfileMediaKind): Promise<void> {
  const existing = await findProfileMediaFile(userId, kind);
  if (existing) await fs.unlink(existing).catch(() => undefined);
}

export function mimeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}
