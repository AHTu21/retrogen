import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { AuthUserDto } from "../../api";
import type { UserProfilePrefs } from "../../lib/profilePrefs";
import type { ProfileDesign } from "./profileDesign";
import { displayHandle, initials } from "./profileUser";

type Props = {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  authUser: AuthUserDto | null;
  visitedCount: number;
  favoriteCount: number;
  onAvatarFile: (f: File | undefined) => void;
  variant?: "rail" | "compact";
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

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-[0.8125rem]">
      <span className="text-[var(--ph-muted)]">{label}</span>
      <span className="font-medium tabular-nums text-[var(--ph-text)]">{value}</span>
    </div>
  );
}

function AvatarPhoto({
  hasAvatar,
  prefs,
  authUser,
  size,
  onZoom,
  onPick,
}: {
  hasAvatar: boolean;
  prefs: UserProfilePrefs;
  authUser: AuthUserDto | null;
  size: "sm" | "md";
  onZoom: () => void;
  onPick: () => void;
}) {
  const dim = size === "sm" ? "h-14 w-14" : "h-[4.5rem] w-[4.5rem]";
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className={`group relative block overflow-hidden rounded-full shadow-[0_2px_12px_rgb(0_0_0/0.12)] ring-1 ring-[var(--ph-border)] transition hover:ring-[var(--ph-accent)]/35 dark:shadow-[0_2px_16px_rgb(0_0_0/0.35)] ${dim}`}
        onClick={() => hasAvatar && onZoom()}
        title={hasAvatar ? "Открыть фото" : undefined}
      >
        {hasAvatar ? (
          <img src={prefs.avatarDataUrl!} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className={`flex h-full w-full items-center justify-center bg-[var(--ph-surface-elevated)] font-medium text-[var(--ph-muted)] ${
              size === "sm" ? "text-base" : "text-lg"
            }`}
          >
            {initials(prefs, authUser)}
          </span>
        )}
        {hasAvatar ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 text-[0.625rem] font-medium text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
            Просмотр
          </span>
        ) : null}
      </button>
      <button
        type="button"
        className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ph-surface-elevated)] ring-2 ring-[var(--ph-surface)] transition hover:bg-[var(--ph-nav-hover)]"
        onClick={onPick}
        aria-label={hasAvatar ? "Сменить фото" : "Добавить фото"}
      >
        <CameraIcon />
      </button>
    </div>
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
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Фото профиля"
      onClick={onClose}
    >
      <button
        type="button"
        className={`absolute right-4 top-4 px-4 py-2 text-[0.9375rem] font-medium text-white/90 transition hover:text-white sm:right-5 sm:top-5 ${d.rFull} bg-white/10 hover:bg-white/15`}
        onClick={onClose}
      >
        Готово
      </button>
      <img
        src={url}
        alt=""
        className={`max-h-[min(80vh,640px)] max-w-full object-contain ${d.r}`}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function ProfileAvatarBlock({
  d,
  prefs,
  authUser,
  visitedCount,
  favoriteCount,
  onAvatarFile,
  variant = "rail",
}: Props) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const role =
    authUser?.globalRole === "admin" ? "Администратор" : authUser ? "Участник" : "Гость";
  const hasAvatar = !!prefs.avatarDataUrl;
  const name = displayHandle(prefs, authUser);

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      className="sr-only"
      onChange={(e) => {
        onAvatarFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  const pickPhoto = () => fileRef.current?.click();

  if (variant === "compact") {
    return (
      <>
        {fileInput}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5">
          <AvatarPhoto
            hasAvatar={hasAvatar}
            prefs={prefs}
            authUser={authUser}
            size="sm"
            onZoom={() => setZoomOpen(true)}
            onPick={pickPhoto}
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[0.9375rem] font-semibold tracking-[-0.01em] text-[var(--ph-text)]">{name}</h1>
            <p className={`truncate text-[0.75rem] ${d.muted}`}>{role}</p>
            {authUser?.email ? (
              <p className={`mt-0.5 truncate text-[0.6875rem] ${d.muted}`}>{authUser.email}</p>
            ) : null}
            <p className={`mt-1.5 text-[0.6875rem] tabular-nums ${d.muted}`}>
              <span className="font-medium text-[var(--ph-text)]">{visitedCount}</span> история ·{" "}
              <span className="font-medium text-[var(--ph-text)]">{favoriteCount}</span> избранное
            </p>
          </div>
          <div className="flex w-full shrink-0 basis-full gap-2 sm:ml-auto sm:w-auto sm:basis-auto">
            <Link to="/home" className={`flex-1 text-center sm:flex-none ${d.btnSecondary}`}>
              Лобби
            </Link>
            {!authUser ? (
              <Link to="/login" className={`flex-1 text-center sm:flex-none ${d.btnGhost}`}>
                Войти
              </Link>
            ) : null}
          </div>
        </div>
        {hasAvatar ? (
          <AvatarLightbox d={d} open={zoomOpen} url={prefs.avatarDataUrl!} onClose={() => setZoomOpen(false)} />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className={`${d.identityCard} w-full`}>
        {fileInput}
        <div className="flex flex-col items-center px-3 pb-2 pt-6">
          <AvatarPhoto
            hasAvatar={hasAvatar}
            prefs={prefs}
            authUser={authUser}
            size="md"
            onZoom={() => setZoomOpen(true)}
            onPick={pickPhoto}
          />
          <h1 className="mt-4 max-w-full truncate text-center text-[0.9375rem] font-semibold tracking-[-0.01em] text-[var(--ph-text)]">
            {name}
          </h1>
          <p className={`mt-0.5 text-center text-[0.75rem] ${d.muted}`}>{role}</p>
          {authUser?.email ? (
            <p className={`mt-1 max-w-full truncate text-center text-[0.6875rem] leading-snug ${d.muted}`}>
              {authUser.email}
            </p>
          ) : null}
        </div>
        <div className="mx-3 my-2 border-t border-[var(--ph-separator)]" />
        <div className="px-1 pb-1">
          <StatRow label="История" value={visitedCount} />
          <StatRow label="Избранное" value={favoriteCount} />
        </div>
        <div className="mt-auto w-full border-t border-[var(--ph-separator)] p-3">
          <Link to="/home" className={`block w-full text-center ${d.btnPrimary}`}>
            Открыть лобби
          </Link>
          {!authUser ? (
            <>
              <button type="button" className={`mt-2 block w-full text-center ${d.btnGhost}`} onClick={pickPhoto}>
                {hasAvatar ? "Сменить фото" : "Добавить фото"}
              </button>
              <Link to="/login" className={`mt-2 block text-center ${d.btnGhost}`}>
                Войти в аккаунт
              </Link>
            </>
          ) : null}
        </div>
      </div>
      {hasAvatar ? (
        <AvatarLightbox d={d} open={zoomOpen} url={prefs.avatarDataUrl!} onClose={() => setZoomOpen(false)} />
      ) : null}
    </>
  );
}
