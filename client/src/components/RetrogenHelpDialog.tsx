import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  isLight: boolean;
  title: string;
  titleId?: string;
  children: ReactNode;
};

export function RetrogenHelpDialog({ open, onClose, isLight, title, titleId = "retrogen-help-dialog-title", children }: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className={`flex max-h-[min(88vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          isLight ? "border-zinc-300 bg-white text-zinc-800" : "border-zinc-600 bg-zinc-900 text-zinc-100"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 ${
            isLight ? "border-zinc-200 bg-zinc-50" : "border-zinc-600 bg-zinc-800/90"
          }`}
        >
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              isLight ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-200 text-zinc-900 hover:bg-white"
            }`}
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm leading-relaxed sm:px-5">{children}</div>
      </div>
    </div>
  );
}

export function RetrogenHelpIconButton({
  isLight,
  onClick,
  title = "Справка",
}: {
  isLight: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={`rounded p-2 text-sm ${isLight ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"}`}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 1 1 3.7 2.2c-.8.45-1.2.95-1.2 1.8v.5" />
        <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}
