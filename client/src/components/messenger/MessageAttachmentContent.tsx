import { useEffect, useState } from "react";
import { IconDownload } from "./MessageComposerIcons";
import { formatFileSize } from "../../lib/messengerAttachments";
import { downloadChatAttachment } from "../../lib/messengerDownload";
import { apiFetch } from "../../api";
import type { MessageAttachmentDto } from "../../types/messenger";

function useAuthedBlobUrl(path: string | null, enabled: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !path) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void apiFetch(path)
      .then((r) => {
        if (!r.ok) throw new Error("fetch_failed");
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, enabled]);

  return url;
}

function DownloadButton({
  attachment,
  isMine,
  busy,
  onDownload,
}: {
  attachment: MessageAttachmentDto;
  isMine: boolean;
  busy: boolean;
  onDownload: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy || !attachment.downloadUrl}
      title={`Скачать ${attachment.originalName}`}
      className={`flex size-7 shrink-0 items-center justify-center rounded-md transition-opacity disabled:opacity-40 ${
        isMine
          ? "text-white/90 hover:bg-white/15 hover:text-white"
          : "text-zinc-500 hover:bg-sky-600/10 hover:text-sky-700 dark:text-zinc-400 dark:hover:bg-sky-500/20 dark:hover:text-sky-300"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onDownload();
      }}
    >
      {busy ? (
        <span className="text-[10px]">…</span>
      ) : (
        <IconDownload className="size-4" />
      )}
      <span className="sr-only">Скачать {attachment.originalName}</span>
    </button>
  );
}

function AttachmentFooter({
  attachment,
  isMine,
  downloading,
  onDownload,
}: {
  attachment: MessageAttachmentDto;
  isMine: boolean;
  downloading: boolean;
  onDownload: () => void;
}) {
  return (
    <div
      className={`flex max-w-full items-center gap-2 px-2 py-1.5 ${
        isMine ? "bg-black/10" : "bg-black/5 dark:bg-black/20"
      }`}
    >
      <span className={`min-w-0 flex-1 truncate text-xs ${isMine ? "opacity-90" : "opacity-80"}`}>
        {attachment.originalName}
        <span className="opacity-60"> · {formatFileSize(attachment.sizeBytes)}</span>
      </span>
      <DownloadButton
        attachment={attachment}
        isMine={isMine}
        busy={downloading}
        onDownload={onDownload}
      />
    </div>
  );
}

function PreviewMedia({
  attachment,
  kind,
  isMine,
  downloading,
  onDownload,
}: {
  attachment: MessageAttachmentDto;
  kind: "image" | "audio" | "video";
  isMine: boolean;
  downloading: boolean;
  onDownload: () => void;
}) {
  const blobUrl = useAuthedBlobUrl(attachment.downloadUrl, attachment.previewable);

  return (
    <div className="max-w-full overflow-hidden rounded-md">
      {!blobUrl ? (
        <p className={`px-2 py-3 text-xs ${isMine ? "opacity-70" : "opacity-60"}`}>Загрузка превью…</p>
      ) : kind === "image" ? (
        <img
          src={blobUrl}
          alt={attachment.originalName}
          className="max-h-48 max-w-full cursor-pointer object-contain"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          title="Скачать изображение"
        />
      ) : kind === "audio" ? (
        <audio controls src={blobUrl} className="max-w-full px-1 pt-1" />
      ) : (
        <video controls src={blobUrl} className="max-h-48 max-w-full rounded-t-md" />
      )}
      <AttachmentFooter
        attachment={attachment}
        isMine={isMine}
        downloading={downloading}
        onDownload={onDownload}
      />
    </div>
  );
}

function FileAttachmentRow({
  attachment,
  isMine,
  downloading,
  onDownload,
}: {
  attachment: MessageAttachmentDto;
  isMine: boolean;
  downloading: boolean;
  onDownload: () => void;
}) {
  return (
    <div
      className={`max-w-full overflow-hidden rounded-md border ${
        isMine ? "border-white/20" : "border-black/10 dark:border-white/10"
      }`}
    >
      <AttachmentFooter attachment={attachment} isMine={isMine} downloading={downloading} onDownload={onDownload} />
    </div>
  );
}

function mediaKind(mime: string): "image" | "audio" | "video" | "file" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

type MessageAttachmentContentProps = {
  attachments: MessageAttachmentDto[];
  isMine: boolean;
};

export function MessageAttachmentContent({ attachments, isMine }: MessageAttachmentContentProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!attachments.length) return null;

  async function handleDownload(a: MessageAttachmentDto) {
    if (!a.downloadUrl || downloadingId) return;
    setDownloadingId(a.id);
    try {
      await downloadChatAttachment(a);
    } catch {
      /* ignore */
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <ul className={`mt-2 flex flex-col gap-2 ${isMine ? "items-end" : "items-start"}`}>
      {attachments.map((a) => {
        const kind = mediaKind(a.mimeType);
        const busy = downloadingId === a.id;
        const onDownload = () => void handleDownload(a);

        if (!a.downloadUrl) {
          return (
            <li key={a.id} className="text-xs opacity-70">
              📎 {a.originalName} ({formatFileSize(a.sizeBytes)})
            </li>
          );
        }

        return (
          <li key={a.id} className="max-w-full">
            {kind !== "file" && a.previewable ? (
              <PreviewMedia
                attachment={a}
                kind={kind}
                isMine={isMine}
                downloading={busy}
                onDownload={onDownload}
              />
            ) : (
              <FileAttachmentRow
                attachment={a}
                isMine={isMine}
                downloading={busy}
                onDownload={onDownload}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
