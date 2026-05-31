import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { s3ReadPlaneImage, s3SavePlaneImage } from "./planeImageS3.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.resolve(__dirname, "../../data/plane-images");

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

export function useS3PlaneImages(): boolean {
  return process.env.PLANE_IMAGE_STORAGE === "s3" && Boolean(process.env.PLANE_IMAGE_S3_BUCKET);
}

export function mimeToExt(mime: string): string | null {
  return MIME_EXT[mime.toLowerCase()] ?? null;
}

export async function savePlaneImageFile(
  roomId: string,
  buffer: Buffer,
  mime: string,
): Promise<{ imageId: string; ext: string }> {
  const ext = mimeToExt(mime);
  if (!ext) throw new Error("unsupported_mime");
  const imageId = nanoid();

  if (useS3PlaneImages()) {
    await s3SavePlaneImage(roomId, imageId, ext, buffer, mime);
    return { imageId, ext };
  }

  const dir = path.join(UPLOAD_ROOT, roomId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${imageId}.${ext}`), buffer);
  return { imageId, ext };
}

export function resolvePlaneImagePath(roomId: string, imageId: string, ext: string): string {
  const safeId = imageId.replace(/[^a-zA-Z0-9_-]/g, "");
  const safeExt = ext.replace(/[^a-z0-9]/gi, "");
  const full = path.join(UPLOAD_ROOT, roomId, `${safeId}.${safeExt}`);
  if (!full.startsWith(UPLOAD_ROOT)) throw new Error("invalid_path");
  return full;
}

export async function readPlaneImageFile(roomId: string, imageId: string, ext: string): Promise<Buffer> {
  if (useS3PlaneImages()) {
    return s3ReadPlaneImage(roomId, imageId, ext);
  }
  return fs.readFile(resolvePlaneImagePath(roomId, imageId, ext));
}
