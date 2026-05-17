import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RetrogenDockableAbout } from "../components/RetrogenDockableAbout";
import { RetrogenDockableHelpRoot, RetrogenDockableHelpToggle } from "../components/RetrogenDockableHelp";
import { RetrogenOverflowMenu } from "../components/RetrogenOverflowMenu";
import { ThemeCornersIconButtons } from "../components/ThemeCornersIconButtons";
import { fetchAuthMe, logoutAccount, type AuthUserDto } from "../api";
import { getFavoriteSlugs, getVisitedRooms } from "../lib/roomLobbyPrefs";
import type { CursorStyle } from "../lib/profilePrefs";
import { cursorCss, loadProfilePrefs, MAX_WALLPAPER_CHARS, saveProfilePrefs, type UserProfilePrefs } from "../lib/profilePrefs";
import { useAppCorners, useAppTheme } from "../theme";

/** Тёмно-зелёная палитра страницы профиля (как 4PDA, но в зелёных тонах). */
const profileUi = {
  dark: {
    page: "bg-[#0b1410] text-emerald-50",
    sticky: "border-emerald-950/90 bg-[#0b1410]/95",
    card: "border-emerald-900/55 bg-[#142019] text-emerald-50",
    cardHeader: "border-emerald-900/55 bg-[#1a2a22]",
    cardBorder: "border-emerald-900/55",
    muted: "text-emerald-600",
    label: "text-emerald-600",
    value: "text-emerald-50",
    link: "text-emerald-400",
    accent: "text-emerald-400",
    input: "border-emerald-800 bg-[#0a120e]",
    avatar: "border-emerald-800 bg-emerald-950",
    notepad: "border-emerald-900/45 bg-[#1a2e22] text-emerald-50 placeholder:text-emerald-700/45",
    btn: "bg-emerald-800 hover:bg-emerald-700",
  },
  light: {
    page: "bg-emerald-50 text-emerald-950",
    sticky: "border-emerald-200/90 bg-emerald-50/95",
    card: "border-emerald-200 bg-white text-emerald-950",
    cardHeader: "border-emerald-200 bg-emerald-50/80",
    cardBorder: "border-emerald-200",
    muted: "text-emerald-700/70",
    label: "text-emerald-700/80",
    value: "text-emerald-950",
    link: "text-emerald-700",
    accent: "text-emerald-700",
    input: "border-emerald-200 bg-white",
    avatar: "border-emerald-200 bg-emerald-100",
    notepad: "border-emerald-200/90 bg-emerald-100/90 text-emerald-950 placeholder:text-emerald-600/50",
    btn: "bg-emerald-700 hover:bg-emerald-600",
  },
} as const;

function t(isLight: boolean) {
  return isLight ? profileUi.light : profileUi.dark;
}

function usernameFromEmail(email: string) {
  const local = email.split("@")[0]?.trim();
  return local || "user";
}

function displayHandle(prefs: UserProfilePrefs, authUser: AuthUserDto | null) {
  if (prefs.displayName.trim()) return prefs.displayName.trim();
  if (authUser?.displayName?.trim()) return authUser.displayName.trim();
  if (authUser?.email) return usernameFromEmail(authUser.email);
  return "Гость";
}

function initials(prefs: UserProfilePrefs, authUser: AuthUserDto | null) {
  const name = displayHandle(prefs, authUser);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function formatNowShort() {
  try {
    return new Date().toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Сегодня";
  }
}

function contactLines(contact: string) {
  return contact
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function cursorLabel(v: CursorStyle) {
  switch (v) {
    case "crosshair":
      return "Прицел";
    case "pointer":
      return "Рука";
    case "grab":
      return "Захват";
    default:
      return "Обычный";
  }
}

function ProfileCard({
  title,
  icon,
  children,
  footer,
  className = "",
  isLight,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  isLight: boolean;
}) {
  const ui = t(isLight);
  return (
    <section className={`flex min-h-0 flex-col rounded border ${className} ${ui.card}`}>
      <header className={`flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold ${ui.cardHeader}`}>
        <span className={ui.muted} aria-hidden>
          {icon}
        </span>
        {title}
      </header>
      <div className="flex flex-1 flex-col px-4 py-3 text-sm">{children}</div>
      {footer ? (
        <footer className={`mt-auto border-t px-4 py-2 text-xs ${ui.cardBorder}`}>{footer}</footer>
      ) : null}
    </section>
  );
}

function ProfileRow({ label, value, isLight }: { label: string; value: ReactNode; isLight: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(7rem,42%)_1fr] gap-x-3 gap-y-0.5 border-b border-dotted border-emerald-900/25 py-1.5 last:border-0">
      <span className={t(isLight).label}>{label}</span>
      <span className={t(isLight).value}>{value}</span>
    </div>
  );
}

function ProfileLink({
  to,
  onClick,
  children,
  isLight,
}: {
  to?: string;
  onClick?: () => void;
  children: ReactNode;
  isLight: boolean;
}) {
  const cls = `${t(isLight).link} hover:underline`;
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { themeMode, toggleTheme } = useAppTheme();
  const { cornerMode, toggleCorners } = useAppCorners();
  const isLight = themeMode === "light";
  const isRounded = cornerMode === "rounded";
  const initial = useMemo(() => loadProfilePrefs(), []);
  const [prefs, setPrefs] = useState<UserProfilePrefs>(initial);
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserDto | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [editIdentity, setEditIdentity] = useState(false);
  const [editPersonal, setEditPersonal] = useState(false);

  const visitedCount = useMemo(() => getVisitedRooms().length, []);
  const favoriteCount = useMemo(() => getFavoriteSlugs().length, []);

  useEffect(() => {
    void fetchAuthMe().then(setAuthUser);
  }, []);

  function commit(next: UserProfilePrefs) {
    saveProfilePrefs(next);
    try {
      window.dispatchEvent(new CustomEvent("retrogen-profile"));
    } catch {
      /* ignore */
    }
    setSavedHint("Сохранено");
    window.setTimeout(() => setSavedHint(null), 2400);
  }

  function onWallpaperFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      window.alert("Выберите файл изображения.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : null;
      if (!url || url.length > MAX_WALLPAPER_CHARS) {
        window.alert("Файл слишком большой для сохранения в браузере — выберите другое изображение.");
        return;
      }
      const next = { ...prefs, wallpaperDataUrl: url };
      setPrefs(next);
      commit(next);
    };
    reader.readAsDataURL(f);
  }

  const handle = displayHandle(prefs, authUser);
  const rankLabel =
    authUser?.globalRole === "admin" ? "Администратор" : authUser ? "Постоянный" : "Гость";
  const rankClass = authUser?.globalRole === "admin" ? "text-emerald-300" : "text-emerald-500";
  const contacts = contactLines(prefs.contact);
  const deviceLines = prefs.devices
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const profileHelpBody = (
    <>
      <p className="opacity-90">
        Профиль в стиле карточек: личные данные, блокнот и оформление комнаты. Всё сохраняется <strong>в этом браузере</strong>.
      </p>
      <p className="mt-3 opacity-90">
        «Изменить» открывает поля в карточке. Кнопка «Сохранить» внизу страницы записывает все настройки.
      </p>
    </>
  );

  const ui = t(isLight);

  return (
    <RetrogenDockableHelpRoot
      isLight={isLight}
      title="Справка: профиль"
      onHelpOpenCloseAbout={() => setAboutOpen(false)}
      body={profileHelpBody}
    >
      <div
        className={`min-h-screen px-3 py-6 sm:px-4 ${ui.page}`}
        style={{ cursor: cursorCss(prefs.cursorStyle) }}
      >
        <div className="mx-auto w-full max-w-6xl">
          <div
            className={`sticky top-0 z-30 mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3 pt-1 backdrop-blur ${ui.sticky}`}
          >
            <Link
              to="/home"
              className={`text-sm font-medium ${ui.link} hover:underline`}
            >
              ← Лобби
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {savedHint ? (
                <span className="text-xs text-emerald-500">{savedHint}</span>
              ) : null}
              <ThemeCornersIconButtons
                isLight={isLight}
                isRounded={isRounded}
                toggleTheme={toggleTheme}
                toggleCorners={toggleCorners}
              />
              <RetrogenDockableHelpToggle isLight={isLight} />
              <RetrogenOverflowMenu
                isLight={isLight}
                onAbout={() => setAboutOpen(true)}
                authVariant={authUser ? "user" : "guest"}
                onLogout={() => {
                  logoutAccount();
                  setAuthUser(null);
                  navigate("/", { replace: true });
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Карточка пользователя */}
            <ProfileCard
              isLight={isLight}
              title="Профиль"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              }
              footer={
                <div className="flex justify-between gap-2">
                  <ProfileLink isLight={isLight} onClick={() => setEditIdentity((v) => !v)}>
                    {editIdentity ? "Готово" : "Изменить"}
                  </ProfileLink>
                  {authUser ? (
                    <span className={ui.muted}>Пароль — через админа</span>
                  ) : (
                    <ProfileLink isLight={isLight} to="/login">
                      Войти
                    </ProfileLink>
                  )}
                </div>
              }
            >
              <div className="flex gap-4">
                <div className={`h-24 w-24 shrink-0 overflow-hidden rounded border ${ui.avatar}`}>
                  {prefs.wallpaperDataUrl ? (
                    <img src={prefs.wallpaperDataUrl} alt="" className="h-full w-full object-cover grayscale" />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center text-2xl font-bold ${ui.muted}`}>
                      {initials(prefs, authUser)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {editIdentity ? (
                    <label className="mb-2 block">
                      <span className={`text-xs ${ui.label}`}>Имя на доске</span>
                      <input
                        className={`mt-0.5 w-full rounded border px-2 py-1 text-sm ${ui.input}`}
                        value={prefs.displayName}
                        onChange={(e) => setPrefs({ ...prefs, displayName: e.target.value })}
                      />
                    </label>
                  ) : (
                    <>
                      <h1 className="text-lg font-bold leading-tight">{handle}</h1>
                      <p className={`mt-0.5 text-sm ${rankClass}`}>{rankLabel}</p>
                    </>
                  )}
                  <p className={`mt-1 text-xs ${ui.muted}`}>
                    {authUser ? "Пользователь" : "Гость (локальный профиль)"}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-0">
                <ProfileRow
                  isLight={isLight}
                  label="Регистрация"
                  value={authUser ? "В аккаунте Retrogen" : "—"}
                />
                <ProfileRow isLight={isLight} label="Предупреждения" value="0%" />
                <ProfileRow isLight={isLight} label="Последний визит" value={`Сегодня, ${formatNowShort()}`} />
              </div>
              <div className={`mt-3 border-t pt-3 ${ui.cardBorder}`}>
                <p className={`mb-1 text-xs ${ui.label}`}>Подпись</p>
                {editIdentity ? (
                  <textarea
                    className={`min-h-[52px] w-full rounded border px-2 py-1 text-sm ${ui.input}`}
                    value={prefs.signature}
                    placeholder="Нет подписи"
                    onChange={(e) => setPrefs({ ...prefs, signature: e.target.value })}
                  />
                ) : (
                  <p className={`text-sm italic ${prefs.signature ? "" : ui.muted}`}>
                    {prefs.signature.trim() || "Нет подписи"}
                  </p>
                )}
              </div>
              {authUser?.email ? (
                <p className={`mt-2 truncate text-xs ${ui.label}`}>{authUser.email}</p>
              ) : null}
            </ProfileCard>

            {/* Личные данные */}
            <ProfileCard
              isLight={isLight}
              title="Личные данные"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              }
              footer={
                <ProfileLink isLight={isLight} onClick={() => setEditPersonal((v) => !v)}>
                  {editPersonal ? "Готово" : "Изменить"}
                </ProfileLink>
              }
            >
              {editPersonal ? (
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col gap-0.5">
                    <span className={`text-xs ${ui.label}`}>Пол</span>
                    <input
                      className={`rounded border px-2 py-1 text-sm ${ui.input}`}
                      value={prefs.gender}
                      onChange={(e) => setPrefs({ ...prefs, gender: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className={`text-xs ${ui.label}`}>Город</span>
                    <input
                      className={`rounded border px-2 py-1 text-sm ${ui.input}`}
                      value={prefs.city}
                      onChange={(e) => setPrefs({ ...prefs, city: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className={`text-xs ${ui.label}`}>Дата рождения</span>
                    <input
                      className={`rounded border px-2 py-1 text-sm ${ui.input}`}
                      value={prefs.birthDate}
                      placeholder="6 сентября 1990"
                      onChange={(e) => setPrefs({ ...prefs, birthDate: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className={`text-xs ${ui.label}`}>Контакты</span>
                    <textarea
                      className={`min-h-[72px] rounded border px-2 py-1 text-sm ${ui.input}`}
                      value={prefs.contact}
                      placeholder="Email, Telegram, @username…"
                      onChange={(e) => setPrefs({ ...prefs, contact: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-col gap-0.5">
                    <span className={`text-xs ${ui.label}`}>Устройства (по строке)</span>
                    <textarea
                      className={`min-h-[72px] rounded border px-2 py-1 text-sm ${ui.input}`}
                      value={prefs.devices}
                      onChange={(e) => setPrefs({ ...prefs, devices: e.target.value })}
                    />
                  </label>
                </div>
              ) : (
                <>
                  <ProfileRow isLight={isLight} label="Пол" value={prefs.gender.trim() || "—"} />
                  <ProfileRow isLight={isLight} label="Город" value={prefs.city.trim() || "—"} />
                  <ProfileRow isLight={isLight} label="Дата рождения" value={prefs.birthDate.trim() || "—"} />
                  <ProfileRow isLight={isLight} label="На сайте" value={formatNowShort()} />
                  <p className={`mb-1 mt-3 text-xs font-semibold ${ui.muted}`}>Контакты</p>
                  {contacts.length ? (
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {contacts.map((line) => (
                        <li key={line} className="flex gap-1.5">
                          <span className="text-emerald-400">■</span>
                          <span className="break-all text-emerald-400">{line}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className={`text-sm ${ui.muted}`}>Не указаны</p>
                  )}
                  <p className={`mb-1 mt-3 text-xs font-semibold ${ui.muted}`}>Устройства</p>
                  {deviceLines.length ? (
                    <ul className={`space-y-0.5 text-sm ${ui.value}`}>
                      {deviceLines.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className={`text-sm ${ui.muted}`}>Не указаны</p>
                  )}
                </>
              )}
            </ProfileCard>

            {/* Статистика */}
            <ProfileCard
              isLight={isLight}
              title="Статистика"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M3 13h2v8H3v-8zm4-4h2v12H7V9zm4-2h2v14h-2V7zm4 4h2v10h-2V11zm4-6h2v16h-2V5z" />
                </svg>
              }
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${ui.label}`}>
                    Retrogen
                  </p>
                  <ul className="space-y-1">
                    <li className="flex justify-between gap-2">
                      <span className={ui.label}>Избранное</span>
                      <span className="font-medium text-emerald-400">{favoriteCount}</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className={ui.label}>История</span>
                      <span className="font-medium text-emerald-400">{visitedCount}</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className={ui.label}>Обои</span>
                      <span className="font-medium text-emerald-400">{prefs.wallpaperDataUrl ? "Да" : "Нет"}</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${ui.label}`}>
                    Комната
                  </p>
                  <ul className="space-y-1">
                    <li className="flex justify-between gap-2">
                      <span className={ui.label}>Курсор</span>
                      <span className="font-medium text-emerald-400">{cursorLabel(prefs.cursorStyle)}</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className={ui.label}>Фон доски</span>
                      <span className="font-medium text-emerald-400">{prefs.boardBackdrop.trim() ? "Задан" : "—"}</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className={ui.label}>Шапка</span>
                      <span className="font-medium text-emerald-400">{prefs.headerTint.trim() ? "Задан" : "—"}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </ProfileCard>

            {/* Журнал предупреждений */}
            <ProfileCard
              isLight={isLight}
              title="Журнал предупреждений"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                </svg>
              }
            >
              <p className={`py-6 text-center text-sm ${ui.muted}`}>Записей нет</p>
            </ProfileCard>

            {/* Блокнот */}
            <ProfileCard
              isLight={isLight}
              className="lg:col-span-2"
              title="Блокнот"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              }
              footer={
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-emerald-400 hover:underline"
                    onClick={() => commit(prefs)}
                  >
                    Сохранить
                  </button>
                </div>
              }
            >
              <p className={`mb-2 text-xs leading-relaxed ${ui.muted}`}>
                Личный блокнот: заметки, ссылки и черновики — только в этом браузере.
              </p>
              <textarea
                className={`min-h-[140px] w-full resize-y rounded border px-3 py-2 text-sm leading-relaxed ${ui.notepad}`}
                value={prefs.notepad}
                placeholder="Здесь можно хранить важную информацию…"
                onChange={(e) => setPrefs({ ...prefs, notepad: e.target.value })}
              />
            </ProfileCard>
          </div>

          {/* Оформление комнаты */}
          <section
            id="retrogen-profile-settings"
            className={`mt-4 rounded border p-4 ${ui.card}`}
          >
            <h2 className="mb-3 text-sm font-semibold">Оформление комнаты</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className={`text-xs ${ui.label}`}>Фон комнаты (CSS)</span>
                <input
                  className={`rounded border px-2 py-1.5 font-mono text-xs ${ui.input}`}
                  value={prefs.boardBackdrop}
                  placeholder="#e2e8f0"
                  onChange={(e) => setPrefs({ ...prefs, boardBackdrop: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className={`text-xs ${ui.label}`}>Фон шапки (CSS)</span>
                <input
                  className={`rounded border px-2 py-1.5 font-mono text-xs ${ui.input}`}
                  value={prefs.headerTint}
                  placeholder="rgba(255,255,255,0.75)"
                  onChange={(e) => setPrefs({ ...prefs, headerTint: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className={`text-xs ${ui.label}`}>Курсор на доске</span>
                <select
                  className={`rounded border px-2 py-1.5 text-sm ${ui.input}`}
                  value={prefs.cursorStyle}
                  onChange={(e) => setPrefs({ ...prefs, cursorStyle: e.target.value as CursorStyle })}
                >
                  <option value="default">Обычный</option>
                  <option value="pointer">Рука</option>
                  <option value="grab">Захват</option>
                  <option value="crosshair">Прицел</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className={`text-xs ${ui.label}`}>Аватар / обои (изображение)</span>
                <input type="file" accept="image/*" className="text-sm" onChange={(e) => onWallpaperFile(e.target.files?.[0])} />
                {prefs.wallpaperDataUrl ? (
                  <button
                    type="button"
                    className="self-start text-xs text-rose-500 hover:underline"
                    onClick={() => {
                      const next = { ...prefs, wallpaperDataUrl: null };
                      setPrefs(next);
                      commit(next);
                    }}
                  >
                    Убрать изображение
                  </button>
                ) : null}
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                onClick={() => commit(prefs)}
              >
                Сохранить всё
              </button>
            </div>
          </section>
        </div>
      </div>
      <RetrogenDockableAbout open={aboutOpen} onClose={() => setAboutOpen(false)} isLight={isLight} />
    </RetrogenDockableHelpRoot>
  );
}
