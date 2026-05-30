const VISITED_KEY = "retrogen_visited_rooms_v1";
const FAVORITES_KEY = "retrogen_favorite_slugs_v1";
const MAX_VISITED = 36;

export type VisitedRoomEntry = {
  slug: string;
  themeSanitized: string;
  status: string;
  lastVisitedAt: string;
};

export const LOBBY_PREFS_EVENT = "retrogen-lobby-prefs";

export function notifyLobbyPrefsChanged() {
  window.dispatchEvent(new CustomEvent(LOBBY_PREFS_EVENT));
}

function writeVisited(next: VisitedRoomEntry[]) {
  localStorage.setItem(VISITED_KEY, JSON.stringify(next));
  notifyLobbyPrefsChanged();
}

function writeFavorites(next: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  notifyLobbyPrefsChanged();
}

export function restoreVisitedRooms(entries: VisitedRoomEntry[]) {
  try {
    writeVisited(entries.slice(0, MAX_VISITED));
  } catch {
    /* ignore */
  }
}

export function restoreFavoriteSlugs(slugs: string[]) {
  try {
    writeFavorites(slugs.filter((s): s is string => typeof s === "string"));
  } catch {
    /* ignore */
  }
}

function readVisited(): VisitedRoomEntry[] {
  try {
    const raw = localStorage.getItem(VISITED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is VisitedRoomEntry =>
          typeof x === "object" &&
          x !== null &&
          typeof (x as VisitedRoomEntry).slug === "string" &&
          typeof (x as VisitedRoomEntry).themeSanitized === "string",
      )
      .slice(0, MAX_VISITED);
  } catch {
    return [];
  }
}

export function recordRoomVisit(p: { slug: string; themeSanitized: string; status: string }) {
  try {
    const cur = readVisited().filter((e) => e.slug !== p.slug);
    const next: VisitedRoomEntry[] = [{ ...p, lastVisitedAt: new Date().toISOString() }, ...cur].slice(0, MAX_VISITED);
    writeVisited(next);
  } catch {
    /* ignore */
  }
}

export function getVisitedRooms(): VisitedRoomEntry[] {
  return readVisited();
}

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function getFavoriteSlugs(): string[] {
  return readFavorites();
}

export function toggleFavoriteSlug(slug: string): boolean {
  const cur = readFavorites();
  const i = cur.indexOf(slug);
  let next: string[];
  let nowFavorite: boolean;
  if (i >= 0) {
    next = [...cur.slice(0, i), ...cur.slice(i + 1)];
    nowFavorite = false;
  } else {
    next = [...cur, slug];
    nowFavorite = true;
  }
  try {
    writeFavorites(next);
  } catch {
    /* ignore */
  }
  return nowFavorite;
}

export function isFavoriteSlug(slug: string): boolean {
  return readFavorites().includes(slug);
}
