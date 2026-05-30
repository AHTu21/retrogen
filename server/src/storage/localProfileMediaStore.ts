import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProfileMediaKind } from "../auth/profileMediaMime.js";
import { extForMime, mimeFromExt, type ProfileMediaReadResult, type ProfileMediaStore } from "./profileMediaTypes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LOCAL_PROFILE_MEDIA_ROOT = path.resolve(__dirname, "../../data/profile-media");

export class LocalProfileMediaStore implements ProfileMediaStore {
  private objectKey(userId: string, kind: ProfileMediaKind, ext: string): string {
    return path.join(LOCAL_PROFILE_MEDIA_ROOT, userId, `${kind}${ext}`);
  }

  async save(userId: string, kind: ProfileMediaKind, buffer: Buffer, mime: string): Promise<void> {
    const dir = path.join(LOCAL_PROFILE_MEDIA_ROOT, userId);
    await fs.mkdir(dir, { recursive: true });
    const ext = extForMime(mime);
    for (const old of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
      if (old === ext) continue;
      await fs.unlink(path.join(dir, `${kind}${old}`)).catch(() => undefined);
    }
    const fullPath = this.objectKey(userId, kind, ext);
    if (!fullPath.startsWith(LOCAL_PROFILE_MEDIA_ROOT)) throw new Error("invalid_path");
    await fs.writeFile(fullPath, buffer);
  }

  async read(userId: string, kind: ProfileMediaKind): Promise<ProfileMediaReadResult | null> {
    const dir = path.join(LOCAL_PROFILE_MEDIA_ROOT, userId);
    for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
      const candidate = path.join(dir, `${kind}${ext}`);
      if (!candidate.startsWith(LOCAL_PROFILE_MEDIA_ROOT)) continue;
      try {
        await fs.access(candidate);
        const buffer = await fs.readFile(candidate);
        return { buffer, mime: mimeFromExt(ext) };
      } catch {
        /* next */
      }
    }
    return null;
  }

  async delete(userId: string, kind: ProfileMediaKind): Promise<void> {
    const dir = path.join(LOCAL_PROFILE_MEDIA_ROOT, userId);
    for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
      await fs.unlink(path.join(dir, `${kind}${ext}`)).catch(() => undefined);
    }
  }
}
