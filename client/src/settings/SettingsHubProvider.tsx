import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useNavigate } from "react-router-dom";
import { fetchAuthMe, logoutAccount, uploadProfileMedia, type AuthUserDto } from "../api";
import { applyProfileBackup, downloadProfileBackup, parseProfileBackup } from "../lib/profileBackup";
import { profileAccentCssVars } from "../lib/profileAccent";
import { MAX_WALLPAPER_CHARS, type UserProfilePrefs } from "../lib/profilePrefs";
import { seedProfileMediaCache } from "../lib/profileMediaCache";
import { useProfileMediaDisplay } from "../lib/useProfileMediaDisplay";
import { useProfilePrefsDraft } from "../lib/useProfilePrefsDraft";
import { useAppCorners, useAppTheme } from "../theme";
import { createProfileDesign, type ProfileDesign } from "../pages/profile/profileDesign";
import {
  applySizePreset,
  clampLayout,
  loadSettingsHubLayout,
  saveSettingsHubLayout,
} from "./settingsHubLayout";
import type { SettingsHubLayout } from "./settingsHubTypes";
import type { SettingsOpenOptions, SettingsSectionId, SettingsSizePreset } from "./settingsHubTypes";
import { SETTINGS_OPEN_EVENT, type SettingsOpenEventDetail } from "./settingsHubTypes";

type SettingsHubCtx = {
  isOpen: boolean;
  section: SettingsSectionId;
  layout: SettingsHubLayout;
  open: (opts?: SettingsOpenOptions) => void;
  close: () => void;
  toggle: (opts?: SettingsOpenOptions) => void;
  setSection: (id: SettingsSectionId) => void;
  setFullscreen: (on: boolean) => void;
  applyPreset: (preset: SettingsSizePreset) => void;
  updateLayout: (patch: Partial<SettingsHubLayout>) => void;
};

const HubCtx = createContext<SettingsHubCtx | null>(null);

export function useSettingsHub(): SettingsHubCtx {
  const ctx = useContext(HubCtx);
  if (!ctx) throw new Error("useSettingsHub must be used within SettingsHubProvider");
  return ctx;
}

export function useSettingsHubOptional(): SettingsHubCtx | null {
  return useContext(HubCtx);
}

type PrefsCtx = {
  d: ProfileDesign;
  isLight: boolean;
  themeMode: "dark" | "light";
  cornerMode: "rounded" | "sharp";
  toggleTheme: () => void;
  toggleCorners: () => void;
  accentStyle: CSSProperties;
  prefs: UserProfilePrefs;
  setPrefs: Dispatch<SetStateAction<UserProfilePrefs>>;
  commit: (next?: UserProfilePrefs) => UserProfilePrefs;
  saveStatus: { kind: string; text: string } | null;
  authUser: AuthUserDto | null;
  wallpaperSrc: string | null | undefined;
  onWallpaperFile: (f: File | undefined) => void;
  onWallpaperClear: () => void;
  onLogout: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File | undefined) => void;
};

const PrefsCtx = createContext<PrefsCtx | null>(null);

export function useSettingsHubPrefs(): PrefsCtx {
  const ctx = useContext(PrefsCtx);
  if (!ctx) throw new Error("useSettingsHubPrefs must be used within SettingsHubProvider");
  return ctx;
}

function readImageFile(f: File, onUrl: (url: string | null) => void) {
  const reader = new FileReader();
  reader.onload = () => onUrl(typeof reader.result === "string" ? reader.result : null);
  reader.onerror = () => onUrl(null);
  reader.readAsDataURL(f);
}

export function SettingsHubProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { themeMode, toggleTheme } = useAppTheme();
  const { cornerMode, toggleCorners } = useAppCorners();
  const isLight = themeMode === "light";
  const isRounded = cornerMode === "rounded";
  const d = useMemo(() => createProfileDesign(isLight, isRounded), [isLight, isRounded]);

  const [isOpen, setIsOpen] = useState(false);
  const [layout, setLayoutState] = useState<SettingsHubLayout>(() => loadSettingsHubLayout());
  const [authUser, setAuthUser] = useState<AuthUserDto | null>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const { prefs, setPrefs, commit, saveStatus, replacePrefs } = useProfilePrefsDraft({
    autosaveMs: 450,
    blockOnIdentityErrors: true,
  });

  const { wallpaperSrc } = useProfileMediaDisplay(prefs);
  const accentStyle = useMemo(() => profileAccentCssVars(prefs.profileAccent, isLight), [prefs.profileAccent, isLight]);

  const persistLayout = useCallback((next: SettingsHubLayout) => {
    const safe = clampLayout(next);
    layoutRef.current = safe;
    setLayoutState(safe);
    saveSettingsHubLayout(safe);
  }, []);

  const open = useCallback(
    (opts?: SettingsOpenOptions) => {
      void fetchAuthMe().then(setAuthUser);
      if (opts?.section) {
        persistLayout({ ...layoutRef.current, section: opts.section });
      }
      setIsOpen(true);
    },
    [persistLayout],
  );

  const close = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback(
    (opts?: SettingsOpenOptions) => {
      if (isOpen) close();
      else open(opts);
    },
    [close, isOpen, open],
  );

  const setSection = useCallback(
    (id: SettingsSectionId) => {
      persistLayout({ ...layoutRef.current, section: id });
    },
    [persistLayout],
  );

  const setFullscreen = useCallback(
    (on: boolean) => {
      persistLayout({ ...layoutRef.current, mode: on ? "fullscreen" : "window" });
    },
    [persistLayout],
  );

  const applyPreset = useCallback(
    (preset: SettingsSizePreset) => {
      persistLayout(applySizePreset(preset, layoutRef.current));
    },
    [persistLayout],
  );

  const updateLayout = useCallback(
    (patch: Partial<SettingsHubLayout>) => {
      persistLayout({ ...layoutRef.current, ...patch });
    },
    [persistLayout],
  );

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<SettingsOpenEventDetail>).detail;
      open(detail);
    };
    window.addEventListener(SETTINGS_OPEN_EVENT, onEvent);
    return () => window.removeEventListener(SETTINGS_OPEN_EVENT, onEvent);
  }, [open]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        toggle();
        return;
      }
      if (e.key !== "Escape") return;
      if (layoutRef.current.mode === "fullscreen") {
        e.preventDefault();
        setFullscreen(false);
        return;
      }
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, isOpen, setFullscreen, toggle]);

  const onWallpaperFile = useCallback(
    (f: File | undefined) => {
      if (!f) return;
      if (!f.type.startsWith("image/")) {
        window.alert("Выберите файл изображения.");
        return;
      }
      if (authUser) {
        void uploadProfileMedia("wallpaper", f)
          .then((res) => {
            readImageFile(f, (url) => {
              if (url) seedProfileMediaCache(res.path, url);
            });
            const next = { ...prefs, wallpaperDataUrl: null, wallpaperMediaPath: res.path };
            setPrefs(next);
            commit(next);
          })
          .catch(() => window.alert("Не удалось загрузить обои на сервер."));
        return;
      }
      readImageFile(f, (url) => {
        if (!url) return;
        if (url.length > MAX_WALLPAPER_CHARS) {
          window.alert("Изображение слишком большое для локального хранения.");
          return;
        }
        const next = { ...prefs, wallpaperDataUrl: url, wallpaperMediaPath: null };
        setPrefs(next);
        commit(next);
      });
    },
    [authUser, commit, prefs, setPrefs],
  );

  const onWallpaperClear = useCallback(() => {
    const next = { ...prefs, wallpaperDataUrl: null, wallpaperMediaPath: null };
    setPrefs(next);
    commit(next);
  }, [commit, prefs, setPrefs]);

  const onLogout = useCallback(() => {
    logoutAccount();
    setAuthUser(null);
    close();
    navigate("/", { replace: true });
  }, [close, navigate]);

  const onExportBackup = useCallback(() => downloadProfileBackup(), []);

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
        } catch {
          window.alert("Не удалось прочитать файл.");
        }
      };
      reader.readAsText(file);
    },
    [replacePrefs],
  );

  const hubCtx = useMemo(
    () =>
      ({
        isOpen,
        section: layout.section,
        layout,
        open,
        close,
        toggle,
        setSection,
        setFullscreen,
        applyPreset,
        updateLayout,
      }) satisfies SettingsHubCtx,
    [applyPreset, close, isOpen, layout, open, setFullscreen, setSection, toggle, updateLayout],
  );

  const prefsCtx = useMemo(
    () =>
      ({
        d,
        isLight,
        themeMode,
        cornerMode,
        toggleTheme,
        toggleCorners,
        accentStyle,
        prefs,
        setPrefs,
        commit,
        saveStatus,
        authUser,
        wallpaperSrc,
        onWallpaperFile,
        onWallpaperClear,
        onLogout,
        onExportBackup,
        onImportBackup,
      }) satisfies PrefsCtx,
    [
      accentStyle,
      authUser,
      commit,
      cornerMode,
      d,
      isLight,
      onExportBackup,
      onImportBackup,
      onLogout,
      onWallpaperClear,
      onWallpaperFile,
      prefs,
      saveStatus,
      themeMode,
      toggleCorners,
      toggleTheme,
      wallpaperSrc,
    ],
  );

  return (
    <HubCtx.Provider value={hubCtx}>
      <PrefsCtx.Provider value={prefsCtx}>{children}</PrefsCtx.Provider>
    </HubCtx.Provider>
  );
}

export function openSettingsHub(opts?: SettingsOpenOptions): void {
  window.dispatchEvent(new CustomEvent(SETTINGS_OPEN_EVENT, { detail: opts ?? {} }));
}
