import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { openSettingsHub } from "../settings";

export type RetrogenOverflowMenuProps = {
  isLight: boolean;
  onAbout: () => void;
  /** «Выйти» только для залогиненного пользователя */
  authVariant: "guest" | "user";
  onLogout?: () => void;
  /** Показать пункт «Лобби» (/home) */
  showLobbyLink?: boolean;
  /** Доп. пункты перед «О программе» */
  extraItems?: ReactNode;
  /** Ссылка «Команда» для страницы настройки состава комнаты (обычно только фасилитатор) */
  teamRoomSlug?: string | null;
  /** Явный обработчик «Настройки»; иначе — глобальный Settings Hub или fallback /profile#room */
  onOpenSettings?: () => void;
};

function menuShell(isLight: boolean) {
  return `absolute right-0 top-full z-[200] mt-2 min-w-[12.5rem] rounded-xl border py-1 shadow-xl ${
    isLight ? "border-zinc-200 bg-white text-zinc-900" : "border-zinc-600 bg-zinc-900 text-zinc-100"
  }`;
}

const itemClass = (isLight: boolean) =>
  `block w-full px-3 py-2.5 text-left text-sm no-underline ${isLight ? "hover:bg-zinc-100" : "hover:bg-zinc-800"}`;

const btnItemClass = (isLight: boolean) =>
  `flex w-full px-3 py-2.5 text-left text-sm ${isLight ? "hover:bg-zinc-100" : "hover:bg-zinc-800"}`;

export function RetrogenOverflowMenu({
  isLight,
  onAbout,
  authVariant,
  onLogout,
  showLobbyLink = true,
  extraItems,
  teamRoomSlug,
  onOpenSettings,
}: RetrogenOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const openSettings = () => {
    setOpen(false);
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
    openSettingsHub();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative z-[60] isolate">
      <button
        type="button"
        className={`rounded p-2 text-sm ${isLight ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-900"}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Меню"
        title="Меню"
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div role="menu" className={menuShell(isLight)}>
          {showLobbyLink ? (
            <Link to="/home" role="menuitem" className={itemClass(isLight)} onClick={() => setOpen(false)}>
              Лобби
            </Link>
          ) : null}
          <Link to="/profile" role="menuitem" className={itemClass(isLight)} onClick={() => setOpen(false)}>
            Профиль
          </Link>
          <button type="button" role="menuitem" className={btnItemClass(isLight)} onClick={openSettings}>
            Настройки
          </button>
          <Link to="/workshop" role="menuitem" className={itemClass(isLight)} onClick={() => setOpen(false)}>
            Мастерская
          </Link>
          <Link to="/messages" role="menuitem" className={itemClass(isLight)} onClick={() => setOpen(false)}>
            Мессенджер
          </Link>
          {teamRoomSlug ? (
            <Link
              to={`/r/${teamRoomSlug}/team`}
              role="menuitem"
              className={itemClass(isLight)}
              onClick={() => setOpen(false)}
            >
              Команда
            </Link>
          ) : null}
          {extraItems}
          <button type="button" role="menuitem" className={btnItemClass(isLight)} onClick={() => { setOpen(false); onAbout(); }}>
            О программе
          </button>
          <div className={`my-1 border-t ${isLight ? "border-zinc-200" : "border-zinc-600"}`} />
          {authVariant === "user" && onLogout ? (
            <button
              type="button"
              role="menuitem"
              className={`${btnItemClass(isLight)} text-red-600 dark:text-red-400`}
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              Выйти
            </button>
          ) : (
            <Link to="/login" role="menuitem" className={itemClass(isLight)} onClick={() => setOpen(false)}>
              Вход / регистрация
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
