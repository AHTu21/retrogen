import { apiFetch } from "../api";
import type { MessageAttachmentDto } from "../types/messenger";

function attachmentFetchUrl(downloadUrl: string, forceDownload: boolean): string {
  if (!forceDownload) return downloadUrl;
  return downloadUrl.includes("?") ? `${downloadUrl}&download=1` : `${downloadUrl}?download=1`;
}

/** Скачать одно вложение на устройство пользователя. */
export async function downloadChatAttachment(
  attachment: MessageAttachmentDto,
): Promise<void> {
  if (!attachment.downloadUrl) return;
  const res = await apiFetch(attachmentFetchUrl(attachment.downloadUrl, true));
  if (!res.ok) throw new Error("download_failed");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = attachment.originalName || "file";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Скачать все вложения сообщения по очереди. */
export async function downloadChatAttachments(
  attachments: MessageAttachmentDto[],
): Promise<void> {
  const list = attachments.filter((a) => a.downloadUrl);
  for (const a of list) {
    await downloadChatAttachment(a);
  }
}
