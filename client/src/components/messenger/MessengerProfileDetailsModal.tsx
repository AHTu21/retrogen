import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getMessengerModalPortalRoot } from "../../lib/messengerModalPortal";
import { MessengerModalBackdrop } from "./MessengerModalBackdrop";
import type { UserProfilePrefs } from "../../lib/profilePrefs";
import { clampSignature, PROFILE_SIGNATURE_MAX } from "../../lib/profileFormFields";
import { ProfilePhoneInput } from "./ProfilePhoneInput";

type Props = {
  open: boolean;
  isLight: boolean;
  applied: UserProfilePrefs;
  accountEmail: string;
  inputClass: string;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: UserProfilePrefs) => void;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-0.5 block text-xs font-medium uppercase tracking-wide opacity-50">{children}</label>
  );
}

export function MessengerProfileDetailsModal({
  open,
  isLight,
  applied,
  accountEmail,
  inputClass,
  saving,
  onClose,
  onSave,
}: Props) {
  const [draft, setDraft] = useState(applied);
  const [aboutFocused, setAboutFocused] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft({
        ...applied,
        signature: clampSignature(applied.signature),
      });
      setAboutFocused(false);
    }
  }, [open, applied]);

  if (!open) return null;

  return createPortal(
    <MessengerModalBackdrop onBackdropClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="messenger-profile-details-title"
        className={`flex max-h-[min(88vh,640px)] w-full flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          isLight ? "border-zinc-300 bg-white text-zinc-800" : "border-zinc-600 bg-zinc-900 text-zinc-100"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 ${
            isLight ? "border-zinc-200" : "border-zinc-700"
          }`}
        >
          <h2 id="messenger-profile-details-title" className="text-base font-semibold">
            О себе
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

        <div className="messenger-modal-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
          <div>
            <FieldLabel>О себе</FieldLabel>
            <textarea
              className={`${inputClass} min-h-[4.5rem]`}
              value={draft.signature}
              maxLength={PROFILE_SIGNATURE_MAX}
              onFocus={() => setAboutFocused(true)}
              onBlur={() => setAboutFocused(false)}
              onChange={(e) => setDraft({ ...draft, signature: clampSignature(e.target.value) })}
            />
            {aboutFocused ? (
              <p
                className={`mt-0.5 text-right text-[11px] tabular-nums ${
                  draft.signature.length >= PROFILE_SIGNATURE_MAX ? "text-amber-500" : "opacity-45"
                }`}
              >
                {draft.signature.length}/{PROFILE_SIGNATURE_MAX}
              </p>
            ) : null}
          </div>

          <div>
            <FieldLabel>Почта</FieldLabel>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              className={`${inputClass} font-sans`}
              value={draft.profileEmail}
              placeholder={accountEmail || "name@example.com"}
              onChange={(e) => setDraft({ ...draft, profileEmail: e.target.value.trim().slice(0, 120) })}
            />
            <p className="mt-0.5 text-[11px] opacity-45">
              Пустое поле — в карточке показывается почта аккаунта ({accountEmail || "не задана"}).
            </p>
          </div>

          <div>
            <FieldLabel>Город</FieldLabel>
            <input
              className={inputClass}
              value={draft.city}
              onChange={(e) => setDraft({ ...draft, city: e.target.value })}
            />
          </div>

          <div>
            <FieldLabel>Тел.</FieldLabel>
            <ProfilePhoneInput
              isLight={isLight}
              inputClass={inputClass}
              value={draft.contact}
              onChange={(contact) => setDraft({ ...draft, contact })}
            />
          </div>

          <p className="text-[11px] leading-relaxed opacity-45">
            Роль, местоимения и часовой пояс — в{" "}
            <a href="/profile#identity" className="underline underline-offset-2">
              настройках профиля
            </a>
            .
          </p>
        </div>

        <div className={`shrink-0 border-t px-4 py-3 ${isLight ? "border-zinc-200" : "border-zinc-700"}`}>
          <button
            type="button"
            disabled={saving}
            className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
            onClick={() =>
              onSave({
                ...draft,
                signature: clampSignature(draft.signature),
              })
            }
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </MessengerModalBackdrop>,
    getMessengerModalPortalRoot(),
  );
}
