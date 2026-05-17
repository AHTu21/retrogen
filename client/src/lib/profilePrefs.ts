const KEY = "retrogen_profile_v1";
/** Макс. длина data URL обоев для localStorage */
export const MAX_WALLPAPER_CHARS = 1_200_000; // ~900KB base64 jpeg rough cap

export type CursorStyle = "default" | "crosshair" | "pointer" | "grab";

export type UserProfilePrefs = {
  displayName: string;
  contact: string;
  gender: string;
  city: string;
  birthDate: string;
  /** многострочный список устройств */
  devices: string;
  signature: string;
  notepad: string;
  /** CSS color e.g. #e2e8f0 or transparent */
  boardBackdrop: string;
  /** CSS color overlay for header bar in room */
  headerTint: string;
  cursorStyle: CursorStyle;
  /** optional data URL for workspace background */
  wallpaperDataUrl: string | null;
};

const defaultPrefs: UserProfilePrefs = {
  displayName: "",
  contact: "",
  gender: "",
  city: "",
  birthDate: "",
  devices: "",
  signature: "",
  notepad: "",
  boardBackdrop: "",
  headerTint: "",
  cursorStyle: "default",
  wallpaperDataUrl: null,
};

export function loadProfilePrefs(): UserProfilePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaultPrefs };
    const p = JSON.parse(raw) as Partial<UserProfilePrefs>;
    return {
      displayName: typeof p.displayName === "string" ? p.displayName : "",
      contact: typeof p.contact === "string" ? p.contact : "",
      gender: typeof p.gender === "string" ? p.gender : "",
      city: typeof p.city === "string" ? p.city : "",
      birthDate: typeof p.birthDate === "string" ? p.birthDate : "",
      devices: typeof p.devices === "string" ? p.devices : "",
      signature: typeof p.signature === "string" ? p.signature : "",
      notepad: typeof p.notepad === "string" ? p.notepad : "",
      boardBackdrop: typeof p.boardBackdrop === "string" ? p.boardBackdrop : "",
      headerTint: typeof p.headerTint === "string" ? p.headerTint : "",
      cursorStyle:
        p.cursorStyle === "crosshair" || p.cursorStyle === "pointer" || p.cursorStyle === "grab"
          ? p.cursorStyle
          : "default",
      wallpaperDataUrl: typeof p.wallpaperDataUrl === "string" ? p.wallpaperDataUrl : null,
    };
  } catch {
    return { ...defaultPrefs };
  }
}

export function saveProfilePrefs(p: UserProfilePrefs) {
  const safe: UserProfilePrefs = {
    ...p,
    wallpaperDataUrl:
      p.wallpaperDataUrl && p.wallpaperDataUrl.length > MAX_WALLPAPER_CHARS
        ? null
        : p.wallpaperDataUrl,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(safe));
  } catch {
    /* ignore quota */
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
