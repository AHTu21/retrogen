const DEFAULT_EMBED_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "vimeo.com",
  "www.figma.com",
  "embed.figma.com",
  "miro.com",
  "docs.google.com",
  "www.google.com",
];

function parseAllowlistEnv(raw: string | undefined): string[] {
  if (!raw?.trim()) return DEFAULT_EMBED_HOSTS;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Allowlist доменов для embed-гаджетов (Vite env или дефолт). */
export function getEmbedAllowlistHosts(): string[] {
  const fromEnv =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_PLANE_EMBED_ALLOWLIST
      ? String(import.meta.env.VITE_PLANE_EMBED_ALLOWLIST)
      : undefined;
  return parseAllowlistEnv(fromEnv);
}

export function isEmbedUrlAllowed(url: string, hosts = getEmbedAllowlistHosts()): boolean {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

export function normalizeEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!isEmbedUrlAllowed(trimmed)) return null;
  return trimmed;
}
