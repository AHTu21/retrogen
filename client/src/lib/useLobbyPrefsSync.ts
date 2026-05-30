import { useCallback, useEffect, useState } from "react";
import { LOBBY_PREFS_EVENT, getFavoriteSlugs, getVisitedRooms } from "./roomLobbyPrefs";

/** Подписка на изменения истории/избранного лобби (localStorage + cross-tab). */
export function useLobbyPrefsSync() {
  const [revision, setRevision] = useState(0);

  const bump = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "retrogen_visited_rooms_v1" || e.key === "retrogen_favorite_slugs_v1") bump();
    };
    const onLocal = () => bump();
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOBBY_PREFS_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOBBY_PREFS_EVENT, onLocal);
    };
  }, [bump]);

  const visited = getVisitedRooms();
  const favorites = getFavoriteSlugs();

  return {
    revision,
    bump,
    visitedCount: visited.length,
    favoriteCount: favorites.length,
    visitedPreview: visited.slice(0, 6),
  };
}
