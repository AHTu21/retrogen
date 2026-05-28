import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.resolve(__dirname, "../../data/chat-attachments");

export function sanitizeOriginalName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^\w.\- ()[\]а-яА-ЯёЁ]+/gu, "_").slice(0, 200) || "file";
}

export async function saveChatAttachmentFile(
  chatId: string,
  originalName: string,
  buffer: Buffer,
): Promise<{ storageKey: string; checksum: string }> {
  const id = nanoid();
  const safeName = sanitizeOriginalName(originalName);
  const dir = path.join(UPLOAD_ROOT, chatId, id);
  await fs.mkdir(dir, { recursive: true });
  const storageKey = `${chatId}/${id}/${safeName}`;
  const fullPath = path.join(UPLOAD_ROOT, storageKey);
  await fs.writeFile(fullPath, buffer);
  const checksum = createHash("sha256").update(buffer).digest("hex");
  return { storageKey, checksum };
}

export function resolveAttachmentPath(storageKey: string): string {
  const normalized = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(UPLOAD_ROOT, normalized);
  if (!full.startsWith(UPLOAD_ROOT)) {
    throw new Error("invalid_storage_key");
  }
  return full;
}

export async function readChatAttachmentFile(storageKey: string): Promise<Buffer> {
  return fs.readFile(resolveAttachmentPath(storageKey));
}
