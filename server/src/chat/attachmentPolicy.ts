/** Политика вложений мессенджера (MVP по docs/MESSENGER_TZ_REVISED.md). */

export const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

/** Расширения из ТЗ (нижний регистр, без точки). */
export const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
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

export function isAllowedAttachmentFilename(name: string): boolean {
  const ext = extensionFromFilename(name);
  if (!ext) return false;
  return ALLOWED_ATTACHMENT_EXTENSIONS.has(ext);
}

/** Значение для `<input accept="...">`. */
export function attachmentAcceptAttribute(): string {
  const exts = [...ALLOWED_ATTACHMENT_EXTENSIONS].map((e) => `.${e}`);
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

export function guessMimeType(filename: string, reported?: string): string {
  const t = (reported ?? "").split(";")[0]?.trim().toLowerCase();
  if (t && t !== "application/octet-stream") return t;
  const ext = extensionFromFilename(filename);
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    avif: "image/avif",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
    aiff: "audio/aiff",
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    "3gp": "video/3gpp",
    zip: "application/zip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    xml: "text/xml",
    json: "application/json",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    odt: "application/vnd.oasis.opendocument.text",
    ipynb: "application/x-ipynb+json",
  };
  return map[ext] ?? "application/octet-stream";
}

export function isPreviewableMime(mime: string): boolean {
  if (mime.startsWith("image/")) return true;
  if (mime.startsWith("audio/")) return true;
  if (mime.startsWith("video/")) return true;
  if (mime.startsWith("text/")) return true;
  if (mime === "application/pdf") return true;
  return false;
}
