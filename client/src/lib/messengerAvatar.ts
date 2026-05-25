import { MAX_WALLPAPER_CHARS } from "./profilePrefs";

export const MAX_AVATAR_DATA_URL_CHARS = MAX_WALLPAPER_CHARS;

export function readImageDataUrlFromFile(
  file: File | undefined,
  onUrl: (url: string) => void,
  onError?: (message: string) => void,
): void {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    onError?.("Выберите файл изображения.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const url = typeof reader.result === "string" ? reader.result : null;
    if (!url || url.length > MAX_AVATAR_DATA_URL_CHARS) {
      onError?.("Файл слишком большой для браузера.");
      return;
    }
    onUrl(url);
  };
  reader.readAsDataURL(file);
}
