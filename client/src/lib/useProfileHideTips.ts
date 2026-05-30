import { useCallback, useState } from "react";
import { loadProfileUiPrefs, setProfileTipsHidden } from "./profileHelpPrefs";

export function useProfileHideTips() {
  const [hideTips, setHideTipsState] = useState(() => loadProfileUiPrefs().hideTips);

  const setHideTips = useCallback((hidden: boolean) => {
    setHideTipsState(hidden);
    setProfileTipsHidden(hidden);
  }, []);

  return { hideTips, setHideTips };
}
