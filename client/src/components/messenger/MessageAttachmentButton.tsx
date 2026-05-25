import { useRef } from "react";
import { messengerAttachmentAccept } from "../../lib/messengerAttachments";
import { IconPaperclip } from "./MessageComposerIcons";
import { composerInlineIconClass } from "./messengerComposerUi";

type MessageAttachmentButtonProps = {
  isLight: boolean;
  disabled?: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
};

export function MessageAttachmentButton({
  isLight,
  disabled,
  onFilesSelected,
}: MessageAttachmentButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative shrink-0">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={messengerAttachmentAccept()}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const list = e.target.files;
          if (list?.length) onFilesSelected(list);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={disabled}
        title="Прикрепить файл (изображения, аудио, видео, документы, архивы…)"
        className={composerInlineIconClass(isLight)}
        onClick={() => inputRef.current?.click()}
      >
        <IconPaperclip />
        <span className="sr-only">Прикрепить файл</span>
      </button>
    </div>
  );
}
