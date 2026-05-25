import { useEffect, useRef } from "react";

export type MessageContextMenuState = {
  messageId: string;
  x: number;
  y: number;
  canReply: boolean;
  canEdit: boolean;
  canDeleteForEveryone: boolean;
  canForwardToSaved: boolean;
  canDownloadAttachments: boolean;
  attachmentCount: number;
};

type MessageContextMenuProps = {
  menu: MessageContextMenuState;
  isLight: boolean;
  onClose: () => void;
  onReply: () => void;
  onEdit: () => void;
  onForwardToSaved: () => void;
  onDownloadAttachments: () => void;
  onDeleteForEveryone: () => void;
  onDeleteForMe: () => void;
};

function MenuItem({
  children,
  onAction,
  className,
}: {
  children: React.ReactNode;
  onAction: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={className}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onAction();
      }}
    >
      {children}
    </button>
  );
}

export function MessageContextMenu({
  menu,
  isLight,
  onClose,
  onReply,
  onEdit,
  onForwardToSaved,
  onDownloadAttachments,
  onDeleteForEveryone,
  onDeleteForMe,
}: MessageContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const itemClass = `block w-full px-3 py-2 text-left text-sm transition-colors ${
    isLight ? "hover:bg-zinc-100" : "hover:bg-zinc-700"
  }`;
  const dangerClass = `${itemClass} ${isLight ? "text-red-700" : "text-red-400"}`;

  return (
    <div
      ref={ref}
      className={`fixed z-[300] min-w-[220px] overflow-hidden rounded-lg border py-1 shadow-lg ${
        isLight ? "border-zinc-200 bg-white text-zinc-900" : "border-zinc-600 bg-zinc-900 text-zinc-100"
      }`}
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {menu.canReply ? (
        <MenuItem className={itemClass} onAction={onReply}>
          Ответить
        </MenuItem>
      ) : null}
      {menu.canEdit ? (
        <MenuItem className={itemClass} onAction={onEdit}>
          Редактировать
        </MenuItem>
      ) : null}
      {menu.canForwardToSaved ? (
        <MenuItem className={itemClass} onAction={onForwardToSaved}>
          В избранное
        </MenuItem>
      ) : null}
      {menu.canDownloadAttachments ? (
        <MenuItem className={itemClass} onAction={onDownloadAttachments}>
          {menu.attachmentCount > 1
            ? `Скачать файлы (${menu.attachmentCount})`
            : "Скачать файл"}
        </MenuItem>
      ) : null}
      {menu.canReply || menu.canEdit || menu.canForwardToSaved || menu.canDownloadAttachments ? (
        <div className={`my-1 border-t ${isLight ? "border-zinc-200" : "border-zinc-700"}`} />
      ) : null}
      {menu.canDeleteForEveryone ? (
        <MenuItem className={dangerClass} onAction={onDeleteForEveryone}>
          Удалить у всех
        </MenuItem>
      ) : null}
      <MenuItem className={dangerClass} onAction={onDeleteForMe}>
        Удалить только у меня
      </MenuItem>
    </div>
  );
}
