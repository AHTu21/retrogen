import { useEffect, useState } from "react";
import type { UserProfilePrefs } from "./profilePrefs";
import {
  prefetchProfileMedia,
  resolveProfileAvatarDisplay,
  resolveProfileWallpaperDisplay,
} from "./profileMediaCache";

/** Подгружает облачные media URL в object-cache и даёт актуальные src для UI. */
export function useProfileMediaDisplay(prefs: UserProfilePrefs) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void prefetchProfileMedia(prefs).then(() => {
      if (!cancelled) setRevision((r) => r + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [prefs.avatarMediaPath, prefs.wallpaperMediaPath]);

  void revision;

  return {
    avatarSrc: resolveProfileAvatarDisplay(prefs),
    wallpaperSrc: resolveProfileWallpaperDisplay(prefs),
  };
}
