import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RetrogenDockableAbout } from "../components/RetrogenDockableAbout";
import { RetrogenDockableHelpRoot, RetrogenDockableHelpToggle } from "../components/RetrogenDockableHelp";
import { RetrogenOverflowMenu } from "../components/RetrogenOverflowMenu";
import { MessengerNavIconButton } from "../components/MessengerNavIconButton";
import { ThemeCornersIconButtons } from "../components/ThemeCornersIconButtons";
import { fetchAuthMe, logoutAccount, type AuthUserDto } from "../api";
import { profileAccentCssVars } from "../lib/profileAccent";
import {
  loadProfilePrefs,
  MAX_WALLPAPER_CHARS,
  saveProfilePrefs,
  type UserProfilePrefs,
} from "../lib/profilePrefs";
import { getFavoriteSlugs, getVisitedRooms } from "../lib/roomLobbyPrefs";
import { useAppCorners, useAppTheme } from "../theme";
import { createProfileDesign } from "./profile/profileDesign";
import { ProfileIdentityColumn } from "./profile/ProfileIdentityColumn";
import { ProfileSectionPanels } from "./profile/ProfileSectionPanels";
import {
  DEFAULT_PROFILE_SECTION,
  parseProfileHash,
  PROFILE_NAV,
  type ProfileSectionId,
} from "./profile/profileHubTheme";

export function ProfilePage() {
  const navigate = useNavigate();
  const { themeMode, toggleTheme } = useAppTheme();
  const { cornerMode, toggleCorners } = useAppCorners();
  const isLight = themeMode === "light";
  const isRounded = cornerMode === "rounded";
  const d = useMemo(() => createProfileDesign(isLight, isRounded), [isLight, isRounded]);

  const [section, setSection] = useState<ProfileSectionId>(() =>
    typeof window !== "undefined" ? parseProfileHash() : DEFAULT_PROFILE_SECTION,
  );
  const [prefs, setPrefs] = useState<UserProfilePrefs>(() => loadProfilePrefs());
  const accentStyle = useMemo(
    () => profileAccentCssVars(prefs.profileAccent, isLight),
    [prefs.profileAccent, isLight],
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(loadProfilePrefs()));
  const [savedHint, setSavedHint] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserDto | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const visitedCount = useMemo(() => getVisitedRooms().length, [savedHint]);
  const favoriteCount = useMemo(() => getFavoriteSlugs().length, [savedHint]);
  const visited = useMemo(() => getVisitedRooms().slice(0, 6), [savedHint]);
  const isDirty = JSON.stringify(prefs) !== savedSnapshot;

  const navItems = useMemo(
    () => PROFILE_NAV.filter((n) => !n.guestHidden || authUser),
    [authUser],
  );

  useEffect(() => {
    void fetchAuthMe().then(setAuthUser);
  }, []);

  useEffect(() => {
    const onHash = () => setSection(parseProfileHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!authUser && (section === "organization" || section === "billing" || section === "danger")) {
      setSection("overview");
      window.location.hash = "overview";
    }
  }, [authUser, section]);

  const goSection = useCallback((id: ProfileSectionId) => {
    const item = PROFILE_NAV.find((n) => n.id === id);
    if (item?.locked) return;
    if (item?.guestHidden && !authUser) return;
    window.location.hash = id;
    setSection(id);
  }, [authUser]);

  const commit = useCallback((next: UserProfilePrefs) => {
    const safe = saveProfilePrefs(next);
    setPrefs(safe);
    setSavedSnapshot(JSON.stringify(safe));
    try {
      window.dispatchEvent(new CustomEvent("retrogen-profile"));
    } catch {
      /* ignore */
    }
    setSavedHint("Сохранено");
    window.setTimeout(() => setSavedHint(null), 2000);
  }, []);

  const autosaveReady = useRef(false);
  useEffect(() => {
    if (!autosaveReady.current) {
      autosaveReady.current = true;
      return;
    }
    if (!isDirty) return;
    const timer = window.setTimeout(() => commit(prefs), 450);
    return () => window.clearTimeout(timer);
  }, [prefs, isDirty, commit]);

  function readImageFile(f: File | undefined, onUrl: (url: string) => void) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      window.alert("Выберите файл изображения.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : null;
      if (!url || url.length > MAX_WALLPAPER_CHARS) {
        window.alert("Файл слишком большой для браузера.");
        return;
      }
      onUrl(url);
    };
    reader.readAsDataURL(f);
  }

  function onAvatarFile(f: File | undefined) {
    readImageFile(f, (url) => {
      const next = { ...prefs, avatarDataUrl: url };
      setPrefs(next);
      commit(next);
    });
  }

  function onWallpaperFile(f: File | undefined) {
    readImageFile(f, (url) => {
      const next = { ...prefs, wallpaperDataUrl: url };
      setPrefs(next);
      commit(next);
    });
  }

  const profileHelpBody = (
    <>
      <p className="opacity-90">
        Единый центр настроек: слева навигация по группам, справа — формы в одном стиле. Изменения сохраняются в браузере автоматически.
      </p>
      <p className="mt-3 opacity-90">После входа настройки можно будет синхронизировать с аккаунтом (PLAN §12).</p>
    </>
  );

  return (
    <RetrogenDockableHelpRoot
      isLight={isLight}
      title="Справка: профиль"
      onHelpOpenCloseAbout={() => setAboutOpen(false)}
      body={profileHelpBody}
    >
      <div className={`profile-app flex min-h-dvh flex-col overflow-x-hidden ${d.page}`} style={accentStyle}>
        <div className="mx-auto flex min-h-0 w-full max-w-[100rem] flex-1 flex-col px-3 py-3 sm:px-5 sm:py-4 lg:px-8 lg:py-5">
          <header
            className={`sticky top-0 z-30 -mx-3 mb-4 flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:-mx-5 sm:mb-6 sm:gap-3 sm:px-5 sm:py-3.5 lg:-mx-6 lg:px-6 ${d.topBar}`}
          >
            <Link to="/home" className="group transition hover:opacity-80">
              <p className={d.eyebrow}>Retrogen</p>
              <p className="mt-0.5 text-[1.0625rem] font-semibold tracking-[-0.01em] text-[var(--ph-text)] group-hover:text-[var(--ph-link)]">
                Настройки
              </p>
            </Link>
            <div className="flex flex-wrap items-center gap-2.5">
              {savedHint ? (
                <span className="text-[0.8125rem] font-medium text-[var(--ph-accent)]">{savedHint}</span>
              ) : isDirty ? (
                <span className={`text-[0.8125rem] ${d.muted}`}>Сохранение…</span>
              ) : null}
              <ThemeCornersIconButtons
                isLight={isLight}
                isRounded={isRounded}
                toggleTheme={toggleTheme}
                toggleCorners={toggleCorners}
              />
              <MessengerNavIconButton isLight={isLight} />
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
          </header>

          {!authUser ? (
            <p className={`mb-6 px-4 py-3 text-[0.9375rem] ${d.noticeInfo} ${d.rSm}`}>
              Гостевой режим — настройки только в этом браузере.{" "}
              <Link to="/login" className={d.link}>
                Войти
              </Link>
            </p>
          ) : null}

          <div className={`flex min-h-0 flex-1 flex-col ${d.shell} lg:flex-row lg:items-stretch lg:overflow-hidden`}>
            <ProfileIdentityColumn
              d={d}
              prefs={prefs}
              authUser={authUser}
              section={section}
              navItems={navItems}
              visitedCount={visitedCount}
              favoriteCount={favoriteCount}
              onGoSection={goSection}
              onAvatarFile={onAvatarFile}
            />
            <main
              className={`${d.main} ${d.mainPad} flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain`}
              id="retrogen-profile-settings"
            >
              <ProfileSectionPanels
                d={d}
                section={section}
                prefs={prefs}
                setPrefs={setPrefs}
                authUser={authUser}
                visited={visited}
                visitedCount={visitedCount}
                favoriteCount={favoriteCount}
                onWallpaperFile={onWallpaperFile}
                onGoSection={goSection}
                onLogout={() => {
                  logoutAccount();
                  setAuthUser(null);
                  navigate("/", { replace: true });
                }}
              />
            </main>
          </div>
        </div>

      </div>
      <RetrogenDockableAbout open={aboutOpen} onClose={() => setAboutOpen(false)} isLight={isLight} />
    </RetrogenDockableHelpRoot>
  );
}
