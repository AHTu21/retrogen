import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { logoutAccount } from "../../api";
import type { MessengerSettingsButtonId } from "../../lib/messengerProfileAppearance";
import { getMessengerModalPortalRoot } from "../../lib/messengerModalPortal";
import { MessengerModalBackdrop } from "./MessengerModalBackdrop";

type Props = {
  open: boolean;
  section: MessengerSettingsButtonId | null;
  isLight: boolean;
  onClose: () => void;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

const TITLES: Record<MessengerSettingsButtonId, string> = {
  privacy: "Конфиденциальность",
  notifications: "Уведомления и звуки",
  data: "Данные и память",
  language: "Язык",
};

function SectionBody({
  section,
  isLight,
  onClose,
}: {
  section: MessengerSettingsButtonId;
  isLight: boolean;
  onClose: () => void;
}) {
  const muted = isLight ? "text-zinc-600" : "text-zinc-400";
  const link = isLight ? "text-sky-700 hover:underline" : "text-sky-400 hover:underline";
  const card = isLight ? "rounded-xl border border-zinc-200 bg-zinc-50/80 p-4" : "rounded-xl border border-zinc-700 bg-zinc-800/50 p-4";

  if (section === "privacy") {
    return (
      <div className="space-y-4">
        <div className={card}>
          <p className={`text-xs font-medium uppercase tracking-wide opacity-50`}>Сессия</p>
          <button
            type="button"
            className={`mt-2 text-sm font-medium ${link}`}
            onClick={() => {
              logoutAccount();
              onClose();
            }}
          >
            Выйти из аккаунта
          </button>
        </div>
        <div className={card}>
          <p className={`text-xs font-medium uppercase tracking-wide opacity-50`}>Пароль и 2FA</p>
          <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
            Смена пароля и двухфакторная аутентификация появятся в следующих релизах.
          </p>
        </div>
        <p className={`text-xs ${muted}`}>
          <Link to="/profile#security" className={link} onClick={onClose}>
            Открыть полный раздел в профиле →
          </Link>
        </p>
      </div>
    );
  }

  if (section === "notifications") {
    return (
      <div className="space-y-4">
        <p className={`text-sm leading-relaxed ${muted}`}>
          Email о завершении ретро, звуки сообщений и push-уведомления — в roadmap.
        </p>
        <p className={`text-xs ${muted}`}>
          <Link to="/profile#notifications" className={link} onClick={onClose}>
            Раздел уведомлений в профиле →
          </Link>
        </p>
      </div>
    );
  }

  if (section === "data") {
    return (
      <div className="space-y-4">
        <div
          className={`rounded-xl border p-4 ${
            isLight ? "border-red-200 bg-red-50/80" : "border-red-900/50 bg-red-950/25"
          }`}
        >
          <h3 className="text-sm font-semibold">Экспорт и удаление</h3>
          <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
            Запрос персональных данных и удаление аккаунта — по регламенту для корпоративных клиентов.
          </p>
          <button
            type="button"
            disabled
            className={`mt-4 rounded-lg border px-3 py-2 text-sm opacity-50 ${
              isLight ? "border-zinc-300 bg-white" : "border-zinc-600 bg-zinc-900"
            }`}
          >
            Запросить экспорт (скоро)
          </button>
        </div>
        <p className={`text-xs ${muted}`}>
          <Link to="/profile#danger" className={link} onClick={onClose}>
            Опасная зона в профиле →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <p className={`text-xs font-medium uppercase tracking-wide opacity-50`}>Интерфейс</p>
        <p className="mt-2 text-sm font-medium">Русский</p>
        <p className={`mt-2 text-sm leading-relaxed ${muted}`}>
          Другие языки интерфейса появятся в следующих версиях.
        </p>
      </div>
      <p className={`text-xs ${muted}`}>
        <Link to="/profile#overview" className={link} onClick={onClose}>
          Обзор в полном профиле →
        </Link>
      </p>
    </div>
  );
}

export function MessengerProfileSettingsModal({ open, section, isLight, onClose }: Props) {
  if (!open || !section) return null;

  return createPortal(
    <MessengerModalBackdrop maxWidthClass="max-w-lg" onBackdropClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="messenger-profile-settings-title"
        className={`flex max-h-[min(88vh,560px)] w-full flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          isLight ? "border-zinc-300 bg-white text-zinc-800" : "border-zinc-600 bg-zinc-900 text-zinc-100"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3 ${
            isLight ? "border-zinc-200" : "border-zinc-700"
          }`}
        >
          <h2 id="messenger-profile-settings-title" className="text-base font-semibold">
            {TITLES[section]}
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

        <div className="messenger-modal-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <SectionBody section={section} isLight={isLight} onClose={onClose} />
        </div>

        <div className={`shrink-0 border-t px-4 py-3 ${isLight ? "border-zinc-200" : "border-zinc-700"}`}>
          <button
            type="button"
            className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </MessengerModalBackdrop>,
    getMessengerModalPortalRoot(),
  );
}
