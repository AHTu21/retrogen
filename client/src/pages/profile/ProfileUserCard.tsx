import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import type { AuthUserDto } from "../../api";
import type { UserProfilePrefs } from "../../lib/profilePrefs";
import type { ProfileDesign } from "./profileDesign";
import { displayNameWithStatus, initials } from "./profileUser";

type Props = {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  authUser: AuthUserDto | null;
  visitedCount: number;
  favoriteCount: number;
  onAvatarFile: (f: File | undefined) => void;
  avatarSrc?: string | null;
  compact?: boolean;
};

function CameraIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-[var(--ph-text)]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M1 8a2 2 0 012-2h1.172a2 2 0 001.414-.586l.828-.828A2 2 0 015.828 3h2.344a2 2 0 011.414.586l.828.828A2 2 0 0012.828 5H14a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm7 9a4 4 0 100-8 4 4 0 000 8z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AvatarLightbox({
  d,
  open,
  url,
  onClose,
}: {
  d: ProfileDesign;
  open: boolean;
  url: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Фото профиля"
      onClick={onClose}
    >
      <button
        type="button"
        className={`absolute right-4 top-4 z-10 px-4 py-2 text-[0.9375rem] font-medium text-white/90 ${d.rFull} bg-white/10 hover:bg-white/15`}
        onClick={onClose}
      >
        Готово
      </button>
      <img
        src={url}
        alt=""
        className={`max-h-[min(80vh,640px)] max-w-[min(100%,36rem)] object-contain ${d.r}`}
        style={{ maxHeight: "min(80vh, 640px)", maxWidth: "min(100%, 36rem)" }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

export function ProfileUserCard({
  d,
  prefs,
  authUser,
  visitedCount,
  favoriteCount,
  onAvatarFile,
  avatarSrc,
  compact = false,
}: Props) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const displayAvatar = avatarSrc ?? prefs.avatarDataUrl;
  const hasAvatar = !!displayAvatar;
  const name = displayNameWithStatus(prefs, authUser);
  const role = authUser?.globalRole === "admin" ? "Администратор" : authUser ? "Участник" : "Гость";

  const pickPhoto = () => fileRef.current?.click();
  const fileInputId = compact ? "profile-avatar-file-compact" : "profile-avatar-file-sidebar";

  const avatarSize = compact ? "h-12 w-12" : "h-16 w-16";
  const textSize = compact ? "text-[0.9375rem]" : "text-[1rem]";

  return (
    <div className="relative">
      <input
        id={fileInputId}
        ref={fileRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
        onChange={(e) => {
          onAvatarFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div
        className={`border-b border-[var(--ph-separator)] ${compact ? "px-4 py-3" : "px-4 py-4 lg:px-3 lg:py-4"}`}
      >
        <div className={`flex items-center gap-3 ${compact ? "" : "lg:flex-col lg:items-center lg:text-center"}`}>
          <div className="relative shrink-0">
            <button
              type="button"
              className={`relative block overflow-hidden rounded-full ring-2 ring-[var(--ph-border)] transition hover:ring-[var(--ph-accent)]/40 ${avatarSize}`}
              onClick={() => hasAvatar && setZoomOpen(true)}
              title={hasAvatar ? "Открыть фото" : undefined}
            >
              {hasAvatar ? (
                <img src={displayAvatar!} alt="" className="h-full w-full object-cover" />
              ) : (
                <span
                  className={`flex h-full w-full items-center justify-center bg-[var(--ph-surface-elevated)] font-semibold text-[var(--ph-muted)] ${compact ? "text-sm" : "text-lg"}`}
                >
                  {initials(prefs, authUser)}
                </span>
              )}
            </button>
            <button
              type="button"
              className={`absolute -bottom-0.5 -right-0.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--ph-border)] bg-[var(--ph-panel-bg)] shadow-sm transition hover:bg-[var(--ph-nav-hover)] ${compact ? "" : "lg:hidden"}`}
              onClick={pickPhoto}
              aria-label={hasAvatar ? "Сменить фото" : "Добавить фото"}
            >
              <CameraIcon />
            </button>
          </div>

          <div className={`min-w-0 flex-1 ${compact ? "" : "lg:w-full"}`}>
            <p className={`truncate font-semibold tracking-[-0.02em] text-[var(--ph-text)] ${textSize}`}>{name}</p>
            <p className={`truncate text-[0.75rem] ${d.muted}`}>{role}</p>
            {authUser?.email ? (
              <p className={`mt-0.5 truncate text-[0.6875rem] ${d.muted}`}>{authUser.email}</p>
            ) : null}
            <p className={`mt-1.5 text-[0.6875rem] tabular-nums ${d.muted} ${compact ? "" : "hidden lg:block"}`}>
              {visitedCount} в истории · {favoriteCount} в избранном
            </p>
          </div>

          {compact ? (
            <div className="flex shrink-0 items-center gap-2">
              <Link to="/home" className={d.btnSecondary}>
                Лобби
              </Link>
              {!authUser ? (
                <Link to="/login" className={d.btnGhost}>
                  Войти
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        {!compact ? (
          <div className="mt-3 hidden flex-col gap-2 lg:flex">
            <Link to="/home" className={`${d.btnPrimary} w-full`}>
              Открыть лобби
            </Link>
            <label htmlFor={fileInputId} className={`${d.btnSecondary} w-full cursor-pointer`}>
              {hasAvatar ? "Сменить фото" : "Добавить фото"}
            </label>
            {!authUser ? (
              <Link to="/login" className={`${d.btnGhost} w-full`}>
                Войти в аккаунт
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasAvatar ? (
        <AvatarLightbox d={d} open={zoomOpen} url={displayAvatar!} onClose={() => setZoomOpen(false)} />
      ) : null}
    </div>
  );
}
