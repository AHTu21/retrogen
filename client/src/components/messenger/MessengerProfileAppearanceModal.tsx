import { createPortal } from "react-dom";
import { getMessengerModalPortalRoot } from "../../lib/messengerModalPortal";
import type { MessengerProfileAppearance } from "../../lib/messengerProfileAppearance";
import { MessengerModalBackdrop } from "./MessengerModalBackdrop";
import { MessengerProfileAppearancePanel } from "./MessengerProfileAppearancePanel";

type Props = {
  open: boolean;
  isLight: boolean;
  applied: MessengerProfileAppearance;
  onClose: () => void;
  onApply: (next: MessengerProfileAppearance) => void;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function MessengerProfileAppearanceModal({ open, isLight, applied, onClose, onApply }: Props) {
  if (!open) return null;

  return createPortal(
    <MessengerModalBackdrop maxWidthClass="max-w-3xl" paddingClass="p-5 sm:p-6" onBackdropClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="messenger-appearance-modal-title"
        className={`flex max-h-[min(92vh,780px)] w-full flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          isLight ? "border-zinc-300 bg-white text-zinc-800" : "border-zinc-600 bg-zinc-900 text-zinc-100"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 ${
            isLight ? "border-zinc-200" : "border-zinc-700"
          }`}
        >
          <h2 id="messenger-appearance-modal-title" className="text-base font-semibold">
            Оформление профиля
          </h2>
          <button
            type="button"
            className="rounded-md p-1.5 opacity-60 transition-opacity hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <CloseIcon />
          </button>
        </div>

        <MessengerProfileAppearancePanel
          isLight={isLight}
          applied={applied}
          embedded
          onClose={onClose}
          onApply={onApply}
        />
      </div>
    </MessengerModalBackdrop>,
    getMessengerModalPortalRoot(),
  );
}
