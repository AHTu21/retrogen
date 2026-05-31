import type { MemeCropDto } from "../types";

export type PlaneMemeLike = {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  caption?: string;
  rotation?: number;
  crop?: MemeCropDto;
};

export function isDataUrl(src: string): boolean {
  return src.startsWith("data:image/");
}

export function dataUrlToBlob(src: string): Blob {
  const [header, data] = src.split(",");
  if (!data) throw new Error("invalid_data_url");
  const mimeMatch = /data:([^;]+)/.exec(header ?? "");
  const mime = mimeMatch?.[1] ?? "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function resolveMemeSrcUpload(
  slug: string,
  src: string,
  upload: (slug: string, file: File) => Promise<{ url: string }>,
): Promise<string> {
  if (!isDataUrl(src)) return src;
  try {
    const blob = dataUrlToBlob(src);
    const ext = blob.type.includes("jpeg") ? "jpg" : blob.type.includes("webp") ? "webp" : "png";
    const file = new File([blob], `meme.${ext}`, { type: blob.type || "image/png" });
    const { url } = await upload(slug, file);
    return url;
  } catch {
    return src;
  }
}

export async function migrateMemesDataUrls<T extends PlaneMemeLike>(
  slug: string,
  memes: T[],
  upload: (slug: string, file: File) => Promise<{ url: string }>,
): Promise<T[]> {
  let changed = false;
  const next = await Promise.all(
    memes.map(async (m) => {
      if (!isDataUrl(m.src)) return m;
      const url = await resolveMemeSrcUpload(slug, m.src, upload);
      if (url === m.src) return m;
      changed = true;
      return { ...m, src: url };
    }),
  );
  return changed ? next : memes;
}

export type MemeAlignMode = "left" | "center" | "right" | "top" | "middle" | "bottom";

export function alignMemes<T extends PlaneMemeLike>(memes: T[], ids: string[], mode: MemeAlignMode): T[] {
  if (ids.length < 2) return memes;
  const selected = memes.filter((m) => ids.includes(m.id));
  if (selected.length < 2) return memes;
  const ref = selected[0]!;

  return memes.map((m) => {
    if (!ids.includes(m.id)) return m;
    if (m.id === ref.id) return m;
    switch (mode) {
      case "left":
        return { ...m, x: ref.x };
      case "center":
        return { ...m, x: ref.x + ref.width / 2 - m.width / 2 };
      case "right":
        return { ...m, x: ref.x + ref.width - m.width };
      case "top":
        return { ...m, y: ref.y };
      case "middle":
        return { ...m, y: ref.y + ref.height / 2 - m.height / 2 };
      case "bottom":
        return { ...m, y: ref.y + ref.height - m.height };
      default:
        return m;
    }
  });
}

export function normalizeMemeCrop(raw: unknown): MemeCropDto | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const x = Number(o.x);
  const y = Number(o.y);
  const w = Number(o.w ?? o.width);
  const h = Number(o.h ?? o.height);
  if (![x, y, w, h].every(Number.isFinite)) return undefined;
  if (w <= 0 || h <= 0 || w > 1 || h > 1) return undefined;
  if (x < 0 || y < 0 || x + w > 1.001 || y + h > 1.001) return undefined;
  return { x, y, w, h };
}

export function createMemeFromSrc(
  src: string,
  pt: { x: number; y: number },
  size: { width: number; height: number },
  snap: boolean,
  snapFn: (v: number, enabled: boolean) => number,
): PlaneMemeLike {
  const id = `meme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let x = Math.max(0, pt.x - size.width / 2);
  let y = Math.max(0, pt.y - size.height / 2);
  if (snap) {
    x = snapFn(x, true);
    y = snapFn(y, true);
  }
  return { id, src, x, y, width: size.width, height: size.height };
}
