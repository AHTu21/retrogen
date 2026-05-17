import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RetrogenDockableAbout } from "../components/RetrogenDockableAbout";
import { RetrogenDockableHelpRoot, RetrogenDockableHelpToggle } from "../components/RetrogenDockableHelp";
import { RetrogenOverflowMenu } from "../components/RetrogenOverflowMenu";
import { ThemeCornersIconButtons } from "../components/ThemeCornersIconButtons";
import { fetchAuthMe, logoutAccount, type AuthUserDto } from "../api";
import type { CursorStyle } from "../lib/profilePrefs";
import { loadProfilePrefs, MAX_WALLPAPER_CHARS, saveProfilePrefs, type UserProfilePrefs } from "../lib/profilePrefs";
import { useAppCorners, useAppTheme } from "../theme";

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
    setSavedHint("Сохранено локально");
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

  const profileHelpBody = (
    <>
      <p className="opacity-90">
        Настройки на этой странице сохраняются <strong>только в этом браузере</strong>: имя, контакты, фон доски и шапки в комнате, курсор, обои.
      </p>
      <p className="mt-3 opacity-90">
        Кнопки темы, справки и меню — в <strong>липкой шапке</strong> над контентом, на одной ширине с блоком страницы (как на главной). В меню: лобби,
        профиль, настройки с якорем к полям, мастерская, о программе, вход или выход. После изменений нажмите «Сохранить» внизу карточки — появится
        «Сохранено локально».
      </p>
    </>
  );

  return (
    <RetrogenDockableHelpRoot
      isLight={isLight}
      title="Справка: профиль"
      onHelpOpenCloseAbout={() => setAboutOpen(false)}
      body={profileHelpBody}
    >
      <div className="min-h-screen px-4 py-10 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <div className="mx-auto w-full max-w-5xl">
          <div
            className={`sticky top-0 z-30 mb-6 flex flex-wrap items-center justify-end gap-2 border-b pb-3 pt-1 backdrop-blur ${
              isLight ? "border-zinc-200/90 bg-zinc-50/90" : "border-zinc-700/90 bg-zinc-950/90"
            }`}
          >
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
        <div className="mx-auto flex max-w-lg flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link className="text-sm font-medium text-sky-600 underline-offset-2 hover:underline" to="/home">
              ← На главную
            </Link>
            {authUser ? <span className="text-sm text-zinc-500 dark:text-zinc-400">{authUser.email}</span> : null}
          </div>
        <header>
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Локально в браузере</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Профиль и оформление</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Поля ниже только на этом устройстве. В комнате профиль меняет фон страницы, заголовка и указатель мыши; позже можно будет
            показывать часть настроек другим участникам.
          </p>
        </header>

        <section
          id="retrogen-profile-settings"
          className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70"
        >
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Отображаемое имя / ФИО</span>
            <input
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={prefs.displayName}
              placeholder="Иван Иванов"
              onChange={(e) => setPrefs({ ...prefs, displayName: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Контакты (произвольный текст)</span>
            <textarea
              className="min-h-[88px] rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={prefs.contact}
              placeholder="Email, Telegram, @username…"
              onChange={(e) => setPrefs({ ...prefs, contact: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Фон комнаты (CSS)</span>
            <input
              className="rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-950"
              value={prefs.boardBackdrop}
              placeholder="#e2e8f0 или linear-gradient(...)"
              onChange={(e) => setPrefs({ ...prefs, boardBackdrop: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Фон шапки комнаты (CSS color)</span>
            <input
              className="rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-950"
              value={prefs.headerTint}
              placeholder="rgba(255,255,255,0.75)"
              onChange={(e) => setPrefs({ ...prefs, headerTint: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Указатель на странице комнаты</span>
            <select
              className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={prefs.cursorStyle}
              onChange={(e) => setPrefs({ ...prefs, cursorStyle: e.target.value as CursorStyle })}
            >
              <option value="default">Обычный</option>
              <option value="pointer">Рука</option>
              <option value="grab">Захват</option>
              <option value="crosshair">Прицел</option>
            </select>
            <span className="text-xs text-zinc-500">Предпросмотр: курсор страницы здесь тот же — {prefs.cursorStyle}</span>
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Обои (картинка поверх фона)</span>
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => onWallpaperFile(e.target.files?.[0])}
            />
            {prefs.wallpaperDataUrl ? (
              <button
                type="button"
                className="self-start text-xs text-rose-600 underline"
                onClick={() => {
                  const next = { ...prefs, wallpaperDataUrl: null };
                  setPrefs(next);
                  commit(next);
                }}
              >
                Убрать обои
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
              onClick={() => commit(prefs)}
            >
              Сохранить
            </button>
            {savedHint ? <span className="text-xs text-emerald-600 dark:text-emerald-400">{savedHint}</span> : null}
          </div>
        </section>
        </div>
        </div>
      </div>
      <RetrogenDockableAbout open={aboutOpen} onClose={() => setAboutOpen(false)} isLight={isLight} />
    </RetrogenDockableHelpRoot>
  );
}
