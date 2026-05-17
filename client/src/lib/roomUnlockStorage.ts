const key = (slug: string) => `retrogen_room_unlock:${slug}`;

export function getRoomUnlockToken(slug: string): string | null {
  try {
    return sessionStorage.getItem(key(slug));
  } catch {
    return null;
  }
}

export function setRoomUnlockToken(slug: string, token: string | null) {
  try {
    if (!token) sessionStorage.removeItem(key(slug));
    else sessionStorage.setItem(key(slug), token);
  } catch {
    /* ignore */
  }
}

export function unlockHeadersForUrl(url: string): Record<string, string> {
  try {
    const m = url.match(/\/api\/rooms\/([^/?#]+)/);
    if (!m) return {};
    const slug = decodeURIComponent(m[1]);
    const t = getRoomUnlockToken(slug);
    return t ? { "X-Room-Unlock-Token": t } : {};
  } catch {
    return {};
  }
}
