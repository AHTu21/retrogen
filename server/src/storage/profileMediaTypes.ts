import type { ProfileMediaKind } from "../auth/profileMediaMime.js";

export type ProfileMediaReadResult = {
  buffer: Buffer;
  mime: string;
  /** Публичный CDN URL — если задан, GET может отдать redirect вместо тела */
  publicUrl?: string;
};

export interface ProfileMediaStore {
  save(userId: string, kind: ProfileMediaKind, buffer: Buffer, mime: string): Promise<void>;
  read(userId: string, kind: ProfileMediaKind): Promise<ProfileMediaReadResult | null>;
  delete(userId: string, kind: ProfileMediaKind): Promise<void>;
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
