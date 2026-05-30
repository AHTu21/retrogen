import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RetrogenDockableAbout } from "../components/RetrogenDockableAbout";
import { RetrogenDockableHelpRoot, RetrogenDockableHelpToggle } from "../components/RetrogenDockableHelp";
import { RetrogenOverflowMenu } from "../components/RetrogenOverflowMenu";
import { MessengerNavIconButton } from "../components/MessengerNavIconButton";
import { ThemeCornersIconButtons } from "../components/ThemeCornersIconButtons";
import { fetchAuthMe, logoutAccount, updateAuthDisplayName, type AuthUserDto } from "../api";
import { applyProfileBackup, downloadProfileBackup, parseProfileBackup } from "../lib/profileBackup";
import { profileAccentCssVars } from "../lib/profileAccent";
import { MAX_WALLPAPER_CHARS, type UserProfilePrefs } from "../lib/profilePrefs";
import { useLobbyPrefsSync } from "../lib/useLobbyPrefsSync";
import { useProfilePrefsDraft } from "../lib/useProfilePrefsDraft";
import { useAppCorners, useAppTheme } from "../theme";
import { createProfileDesign } from "./profile/profileDesign";
import { ProfileSidebar } from "./profile/ProfileSidebar";
import { ProfileSectionPanels } from "./profile/ProfileSectionPanels";
import {
  DEFAULT_PROFILE_SECTION,
  parseProfileHash,
  PROFILE_NAV,
  PROFILE_NAV_VISIBLE,
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
  const authSeededRef = useRef(false);
  const nameSyncRef = useRef<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserDto | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const syncDisplayNameToAuth = useCallback(
    (safe: UserProfilePrefs) => {
      const trimmed = safe.displayName.trim();
      if (authUser && trimmed && trimmed !== authUser.displayName && nameSyncRef.current !== trimmed) {
        nameSyncRef.current = trimmed;
        void updateAuthDisplayName(trimmed)
          .then((user) => {
            setAuthUser(user);
            nameSyncRef.current = null;
          })
          .catch(() => {
            nameSyncRef.current = null;
          });
      }
    },
    [authUser],
  );

  const {
    prefs,
    setPrefs,
    saveError,
    saveStatus,
    commit,
    replacePrefs,
    flashHint,
  } = useProfilePrefsDraft({
    autosaveMs: 450,
    blockOnIdentityErrors: true,
    onAfterCommit: syncDisplayNameToAuth,
  });

  const accentStyle = useMemo(
    () => profileAccentCssVars(prefs.profileAccent, isLight),
    [prefs.profileAccent, isLight],
  );

  const lobby = useLobbyPrefsSync();
  const { visitedCount, favoriteCount, visitedPreview: visited } = lobby;

  const navItems = useMemo(
    () => PROFILE_NAV_VISIBLE.filter((n) => !n.guestHidden || authUser),
    [authUser],
  );

  useEffect(() => {
    void fetchAuthMe().then(setAuthUser);
  }, []);

  useEffect(() => {
    if (!authUser || authSeededRef.current) return;
    authSeededRef.current = true;
    const serverName = authUser.displayName?.trim();
    if (!serverName) return;
    setPrefs((p) => (p.displayName.trim() ? p : { ...p, displayName: serverName }));
  }, [authUser, setPrefs]);

  useEffect(() => {
    const onHash = () => setSection(parseProfileHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("profile-no-scroll-x");
    return () => document.documentElement.classList.remove("profile-no-scroll-x");
  }, []);

  useEffect(() => {
    if (!authUser && (section === "organization" || section === "billing" || section === "danger")) {
      setSection("overview");
      window.location.hash = "overview";
    }
  }, [authUser, section]);

  const goSection = useCallback(
    (id: ProfileSectionId) => {
      const item = PROFILE_NAV.find((n) => n.id === id);
      if (item?.locked || item?.navHidden) return;
      if (item?.guestHidden && !authUser) return;
      window.location.hash = id;
      setSection(id);
    },
    [authUser],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        (t instanceof HTMLElement && t.isContentEditable)
      ) {
        return;
      }
      if (!e.altKey) return;
      const idx = navItems.findIndex((n) => n.id === section);
      if (idx < 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = navItems[(idx + 1) % navItems.length];
        if (next) goSection(next.id);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = navItems[(idx - 1 + navItems.length) % navItems.length];
        if (next) goSection(next.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [section, navItems, goSection]);

  const onExportBackup = useCallback(() => {
    downloadProfileBackup();
    flashHint("Файл скачан");
  }, [flashHint]);

  const onImportBackup = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = parseProfileBackup(JSON.parse(String(reader.result)));
          if (!parsed) {
            window.alert("Неверный формат файла Retrogen.");
            return;
          }
          if (
            !window.confirm(
              "Импорт заменит настройки профиля в этом браузере (и историю лобби, если есть в файле). Продолжить?",
            )
          ) {
            return;
          }
          const safe = applyProfileBackup(parsed);
          replacePrefs(safe, "Импортировано");
          syncDisplayNameToAuth(safe);
        } catch {
          window.alert("Не удалось прочитать файл.");
        }
      };
      reader.readAsText(file);
    },
    [replacePrefs, syncDisplayNameToAuth],
  );

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
        Центр настроек в стиле System Settings: слева профиль и разделы, справа — формы. Изменения сохраняются в браузере
        автоматически.
      </p>
      <p className="mt-3 opacity-90">
        Автосохранение в браузере. Имя при входе подставляется из аккаунта; экспорт JSON — в «Безопасность». Навигация: Alt+↑/↓
        по разделам.
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
      <div className={`profile-app min-h-dvh overflow-x-clip ${d.page}`} style={accentStyle}>
        <div className="mx-auto flex w-full min-w-0 max-w-[72rem] flex-col overflow-x-clip px-3 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5">
          <header
            className={`sticky top-0 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 py-3 ${d.topBar}`}
          >
            <Link to="/home" className="group min-w-0 transition hover:opacity-80">
              <p className={d.eyebrow}>Retrogen</p>
              <p className="mt-0.5 text-[1.0625rem] font-semibold tracking-[-0.02em] text-[var(--ph-text)] group-hover:text-[var(--ph-link)]">
                Настройки
              </p>
            </Link>
            <div className="flex flex-wrap items-center gap-2.5">
              {saveStatus ? (
                <span
                  className={
                    saveStatus.kind === "saved"
                      ? d.savePillActive
                      : saveStatus.kind === "blocked"
                        ? d.savePillWarn
                        : d.savePill
                  }
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {saveStatus.kind === "saved" ? (
                    <>
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M16.704 5.29a1 1 0 010 1.42l-7.25 7.25a1 1 0 01-1.42 0l-3.25-3.25a1 1 0 111.42-1.42l2.54 2.54 6.54-6.54a1 1 0 011.42 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {saveStatus.text}
                    </>
                  ) : (
                    saveStatus.text
                  )}
                </span>
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
            <p className={`mb-4 px-4 py-3 text-[0.875rem] ${d.noticeBanner} ${d.rSm}`}>
              Гостевой режим — настройки только в этом браузере.{" "}
              <Link to="/login" className={d.link}>
                Войти
              </Link>
            </p>
          ) : null}

          {saveError ? (
            <p className={`mb-4 px-4 py-3 text-[0.875rem] ${d.noticeBanner} ${d.rSm} border-amber-500/30 text-amber-900 dark:text-amber-100`}>
              {saveError}
            </p>
          ) : null}

          <div className={d.window}>
            <ProfileSidebar
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

            <main className={d.detail} id="retrogen-profile-settings">
              <div className={d.detailInner}>
                <ProfileSectionPanels
                  d={d}
                  section={section}
                  prefs={prefs}
                  setPrefs={setPrefs}
                  authUser={authUser}
                  visited={visited}
                  visitedCount={visitedCount}
                  favoriteCount={favoriteCount}
                  lobbyRevision={lobby.revision}
                  onWallpaperFile={onWallpaperFile}
                  onGoSection={goSection}
                  onLogout={() => {
                    logoutAccount();
                    setAuthUser(null);
                    navigate("/", { replace: true });
                  }}
                  onExportBackup={onExportBackup}
                  onImportBackup={onImportBackup}
                />
              </div>
            </main>
          </div>
        </div>
      </div>
      <RetrogenDockableAbout open={aboutOpen} onClose={() => setAboutOpen(false)} isLight={isLight} />
    </RetrogenDockableHelpRoot>
  );
}
