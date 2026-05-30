import { uploadProfileMedia, type AuthUserDto } from "../api";
import { seedProfileMediaCache } from "./profileMediaCache";
import { MAX_WALLPAPER_CHARS, type UserProfilePrefs } from "./profilePrefs";

export type ApplyProfileAvatarResult =
  | { ok: true; prefs: UserProfilePrefs; user?: AuthUserDto }
  | { ok: false; reason: "no_file" | "invalid_image" | "too_large" };

function readImageDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : null;
      if (!url || url.length > MAX_WALLPAPER_CHARS) resolve(null);
      else resolve(url);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/** Загрузка аватара: облако при входе, иначе data URL в prefs. */
export async function applyProfileAvatarFile(
  file: File | undefined,
  prefs: UserProfilePrefs,
  authUser: AuthUserDto | null,
): Promise<ApplyProfileAvatarResult> {
  if (!file) return { ok: false, reason: "no_file" };
  if (!file.type.startsWith("image/")) return { ok: false, reason: "invalid_image" };

  if (authUser) {
    try {
      const res = await uploadProfileMedia("avatar", file);
      const dataUrl = await readImageDataUrl(file);
      if (dataUrl) seedProfileMediaCache(res.path, dataUrl);
      return {
        ok: true,
        prefs: { ...prefs, avatarDataUrl: null, avatarMediaPath: res.path },
        user: res.user,
      };
    } catch {
      const dataUrl = await readImageDataUrl(file);
      if (!dataUrl) return { ok: false, reason: "too_large" };
      return {
        ok: true,
        prefs: { ...prefs, avatarDataUrl: dataUrl, avatarMediaPath: null },
      };
    }
  }

  const dataUrl = await readImageDataUrl(file);
  if (!dataUrl) return { ok: false, reason: "too_large" };
  return { ok: true, prefs: { ...prefs, avatarDataUrl: dataUrl } };
}

export function profileAvatarErrorMessage(reason: "no_file" | "invalid_image" | "too_large"): string {
  if (reason === "invalid_image") return "Выберите файл изображения.";
  if (reason === "too_large") return "Файл слишком большой для браузера.";
  return "Не удалось загрузить фото.";
}
