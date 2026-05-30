import {
  DEFAULT_PROFILE_ACCENT,
  LEGACY_PROFILE_ACCENT,
  normalizeProfileAccent,
} from "./profileAccent";
import {
  DEFAULT_PROFILE_NOTIFICATIONS,
  normalizeProfileNotifications,
  type ProfileEmailNotifications,
} from "./profileNotificationPrefs";
import {
  DEFAULT_BOARD_BACKDROP,
  DEFAULT_HEADER_TINT,
  normalizeBoardBackdropColor,
  normalizeHeaderTintColor,
} from "./profileRoomColors";

/** Прозрачность обоев на доске (0–100), по умолчанию как в превью профиля */
export const DEFAULT_WALLPAPER_OPACITY = 40;

export function normalizeWallpaperOpacity(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n)) return DEFAULT_WALLPAPER_OPACITY;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function wallpaperOpacityFraction(opacity: number): number {
  return normalizeWallpaperOpacity(opacity) / 100;
}

export type SaveProfileResult = {
  prefs: UserProfilePrefs;
  error?: "quota";
};

/** Сброс только оформления комнаты к заводским значениям */
export function defaultRoomStylePrefs(): Pick<
  UserProfilePrefs,
  "boardBackdrop" | "headerTint" | "cursorStyle" | "wallpaperDataUrl" | "wallpaperOpacity"
> {
  return {
    boardBackdrop: DEFAULT_BOARD_BACKDROP,
    headerTint: DEFAULT_HEADER_TINT,
    cursorStyle: "default",
    wallpaperDataUrl: null,
    wallpaperOpacity: DEFAULT_WALLPAPER_OPACITY,
  };
}

const KEY = "retrogen_profile_v1";
/** Макс. длина data URL обоев для localStorage */
export const MAX_WALLPAPER_CHARS = 1_200_000; // ~900KB base64 jpeg rough cap
export type CursorStyle = "default" | "crosshair" | "pointer" | "grab";

export type UserProfilePrefs = {
  displayName: string;
  /** Почта в карточке мессенджера; пусто — показывается email аккаунта */
  profileEmail: string;
  /** Коротко о себе — видно в комнате */
  signature: string;
  /** Роль или должность, напр. «Фасилитатор», «Product» */
  roleTitle: string;
  /** Команда, продукт или компания */
  teamName: string;
  /** Местоимения, напр. он/его — по желанию */
  pronouns: string;
  city: string;
  /** Часовой пояс, напр. Europe/Moscow */
  timezone: string;
  /** Telegram без @ */
  telegram: string;
  /** Сайт или LinkedIn */
  website: string;
  /** Телефон или другой контакт одной строкой */
  contact: string;
  /** @deprecated не показывается в UI, оставлено для старых данных */
  gender: string;
  /** @deprecated */
  birthDate: string;
  /** @deprecated */
  devices: string;
  notepad: string;
  /** CSS color e.g. #e2e8f0 or transparent */
  boardBackdrop: string;
  /** CSS color overlay for header bar in room */
  headerTint: string;
  cursorStyle: CursorStyle;
  /** Акцент страницы профиля (#RRGGBB) */
  profileAccent: string;
  /** Фото профиля (отдельно от обоев доски) */
  avatarDataUrl: string | null;
  /** API-путь облачного аватара (Bearer GET) */
  avatarMediaPath: string | null;
  /** Обои поверх фона комнаты /r/… */
  wallpaperDataUrl: string | null;
  /** API-путь облачных обоев */
  wallpaperMediaPath: string | null;
  /** 0–100: прозрачность слоя обоев на доске */
  wallpaperOpacity: number;
  /** Эмодзи-статус в мессенджере и профиле */
  emojiStatus: string;
  /** Email-уведомления (локально до серверной рассылки) */
  notifications: ProfileEmailNotifications;
};

const defaultPrefs: UserProfilePrefs = {
  displayName: "",
  profileEmail: "",
  signature: "",
  roleTitle: "",
  teamName: "",
  pronouns: "",
  city: "",
  timezone: "",
  telegram: "",
  website: "",
  contact: "",
  gender: "",
  birthDate: "",
  devices: "",
  notepad: "",
  boardBackdrop: "",
  headerTint: "",
  cursorStyle: "default",
  profileAccent: DEFAULT_PROFILE_ACCENT,
  avatarDataUrl: null,
  avatarMediaPath: null,
  wallpaperDataUrl: null,
  wallpaperMediaPath: null,
  wallpaperOpacity: DEFAULT_WALLPAPER_OPACITY,
  emojiStatus: "",
  notifications: { ...DEFAULT_PROFILE_NOTIFICATIONS },
};

const DATA_IMAGE_RE = /^data:image\//i;

/** Обои доски: не показывать аватар профиля (legacy: одно поле на всё). */
export function effectiveBoardWallpaper(
  prefs: Pick<UserProfilePrefs, "wallpaperDataUrl" | "avatarDataUrl">,
): string | null {
  const w = prefs.wallpaperDataUrl?.trim() || null;
  if (!w) return null;
  const a = prefs.avatarDataUrl?.trim() || null;
  if (a && w === a) return null;
  return w;
}

/** CSS-фон доски: без data URL (раньше сюда попадало фото профиля). */
export function effectiveBoardBackdrop(backdrop: string, avatarDataUrl: string | null): string {
  const b = backdrop.trim();
  if (!b) return "";
  if (DATA_IMAGE_RE.test(b)) return "";
  const a = avatarDataUrl?.trim() || null;
  if (a && b === a) return "";
  return b;
}

function sanitizeProfilePrefs(p: UserProfilePrefs): UserProfilePrefs {
  let avatarDataUrl = p.avatarDataUrl?.trim() ? p.avatarDataUrl : null;
  let wallpaperDataUrl = p.wallpaperDataUrl?.trim() ? p.wallpaperDataUrl : null;
  let boardBackdrop = p.boardBackdrop;

  if (boardBackdrop.trim().startsWith("data:image")) {
    if (!avatarDataUrl) avatarDataUrl = boardBackdrop.trim();
    boardBackdrop = "";
  }

  if (!avatarDataUrl && wallpaperDataUrl) {
    avatarDataUrl = wallpaperDataUrl;
    wallpaperDataUrl = null;
  } else if (avatarDataUrl && wallpaperDataUrl && avatarDataUrl === wallpaperDataUrl) {
    wallpaperDataUrl = null;
  }

  boardBackdrop = effectiveBoardBackdrop(boardBackdrop, avatarDataUrl);
  boardBackdrop = normalizeBoardBackdropColor(boardBackdrop);
  const headerTint = normalizeHeaderTintColor(p.headerTint);
  const wallpaperOpacity = normalizeWallpaperOpacity(p.wallpaperOpacity);
  const emojiStatus = typeof p.emojiStatus === "string" ? p.emojiStatus.trim().slice(0, 8) : "";

  return {
    ...p,
    avatarDataUrl,
    wallpaperDataUrl,
    boardBackdrop,
    headerTint,
    wallpaperOpacity,
    emojiStatus,
    notifications: normalizeProfileNotifications(p.notifications),
  };
}

export function loadProfilePrefs(): UserProfilePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultPrefs };
    const p = JSON.parse(raw) as Partial<UserProfilePrefs>;
    const loaded: UserProfilePrefs = {
      displayName: typeof p.displayName === "string" ? p.displayName : "",
      profileEmail: typeof p.profileEmail === "string" ? p.profileEmail.trim().slice(0, 120) : "",
      signature: typeof p.signature === "string" ? p.signature : "",
      roleTitle: typeof p.roleTitle === "string" ? p.roleTitle : "",
      teamName: typeof p.teamName === "string" ? p.teamName : "",
      pronouns: (() => {
        const v = typeof p.pronouns === "string" ? p.pronouns.trim() : "";
        const legacy: Record<string, string> = {
          "he/him": "он/его",
          "she/her": "она/неё",
          "they/them": "они/их",
        };
        return legacy[v] ?? v;
      })(),
      city: typeof p.city === "string" ? p.city : "",
      timezone: typeof p.timezone === "string" ? p.timezone : "",
      telegram: typeof p.telegram === "string" ? p.telegram : "",
      website: typeof p.website === "string" ? p.website : "",
      contact: typeof p.contact === "string" ? p.contact : "",
      gender: typeof p.gender === "string" ? p.gender : "",
      birthDate: typeof p.birthDate === "string" ? p.birthDate : "",
      devices: typeof p.devices === "string" ? p.devices : "",
      notepad: typeof p.notepad === "string" ? p.notepad : "",
      boardBackdrop: typeof p.boardBackdrop === "string" ? p.boardBackdrop : "",
      headerTint: typeof p.headerTint === "string" ? p.headerTint : "",
      cursorStyle:
        p.cursorStyle === "crosshair" || p.cursorStyle === "pointer" || p.cursorStyle === "grab"
          ? p.cursorStyle
          : "default",
      profileAccent: (() => {
        const rawAccent = typeof p.profileAccent === "string" ? p.profileAccent : DEFAULT_PROFILE_ACCENT;
        const norm = normalizeProfileAccent(rawAccent);
        return norm === LEGACY_PROFILE_ACCENT ? DEFAULT_PROFILE_ACCENT : norm;
      })(),
      avatarDataUrl: typeof p.avatarDataUrl === "string" ? p.avatarDataUrl : null,
      avatarMediaPath: typeof p.avatarMediaPath === "string" ? p.avatarMediaPath.trim().slice(0, 120) || null : null,
      wallpaperDataUrl: typeof p.wallpaperDataUrl === "string" ? p.wallpaperDataUrl : null,
      wallpaperMediaPath:
        typeof p.wallpaperMediaPath === "string" ? p.wallpaperMediaPath.trim().slice(0, 120) || null : null,
      wallpaperOpacity: normalizeWallpaperOpacity(p.wallpaperOpacity),
      emojiStatus: typeof p.emojiStatus === "string" ? p.emojiStatus.trim().slice(0, 8) : "",
      notifications: normalizeProfileNotifications(p.notifications),
    };
    const sanitized = sanitizeProfilePrefs(loaded);
    if (JSON.stringify(sanitized) !== JSON.stringify(loaded)) {
      saveProfilePrefs(sanitized);
    }
    return sanitized;
  } catch {
    return { ...defaultPrefs };
  }
}

function capDataUrl(url: string | null) {
  return url && url.length > MAX_WALLPAPER_CHARS ? null : url;
}

/** Нормализует и пишет в localStorage; возвращает итоговые prefs для state. */
export function saveProfilePrefs(p: UserProfilePrefs): SaveProfileResult {
  const safe = sanitizeProfilePrefs({
    ...p,
    avatarDataUrl: capDataUrl(p.avatarDataUrl),
    wallpaperDataUrl: capDataUrl(p.wallpaperDataUrl),
  });
  try {
    localStorage.setItem(KEY, JSON.stringify(safe));
    return { prefs: safe };
  } catch {
    return { prefs: safe, error: "quota" };
  }
}

export function cursorCss(v: CursorStyle): string {
  switch (v) {
    case "crosshair":
      return "crosshair";
    case "pointer":
      return "pointer";
    case "grab":
      return "grab";
    default:
      return "default";
  }
}
