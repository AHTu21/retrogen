/** Клиентская политика вложений (синхронно с server/src/chat/attachmentPolicy.ts). */

export const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "svg",
  "webp",
  "avif",
  "mp3",
  "wav",
  "flac",
  "aiff",
  "mp4",
  "mkv",
  "avi",
  "mov",
  "wmv",
  "flv",
  "webm",
  "3gp",
  "zip",
  "rar",
  "7z",
  "tar",
  "iso",
  "cab",
  "txt",
  "rtf",
  "doc",
  "docx",
  "odt",
  "csv",
  "xml",
  "md",
  "eml",
  "asc",
  "ipynb",
]);

export function extensionFromFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  const i = base.lastIndexOf(".");
  if (i < 1) return "";
  return base.slice(i + 1).toLowerCase();
}

export function isAllowedAttachmentFile(file: File): boolean {
  const ext = extensionFromFilename(file.name);
  return ext.length > 0 && ALLOWED_EXTENSIONS.has(ext);
}

export function messengerAttachmentAccept(): string {
  const exts = [...ALLOWED_EXTENSIONS].map((e) => `.${e}`);
  return [
    ...exts,
    "image/*",
    "audio/*",
    "video/*",
    "text/*",
    "application/pdf",
    "application/zip",
    "application/x-zip-compressed",
  ].join(",");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export type AttachmentPickError = "attachment_type_not_allowed" | "attachment_too_large" | "too_many_attachments";

export function mergePendingAttachments(
  current: File[],
  incoming: File[],
): { files: File[]; error: AttachmentPickError | null } {
  const next = [...current];
  for (const f of incoming) {
    if (next.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
      return { files: next, error: "too_many_attachments" };
    }
    if (!isAllowedAttachmentFile(f)) {
      return { files: next, error: "attachment_type_not_allowed" };
    }
    if (f.size > MAX_ATTACHMENT_BYTES) {
      return { files: next, error: "attachment_too_large" };
    }
    next.push(f);
  }
  return { files: next, error: null };
}

export function attachmentErrorRu(code: AttachmentPickError): string {
  const m: Record<AttachmentPickError, string> = {
    attachment_type_not_allowed: "Тип файла не поддерживается",
    attachment_too_large: "Файл больше 100 МБ",
    too_many_attachments: "Не больше 10 файлов в одном сообщении",
  };
  return m[code];
}
