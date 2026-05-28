import { useMemo } from "react";
import type { AuthUserDto } from "../../../api";
import type { UserProfilePrefs } from "../../../lib/profilePrefs";
import type { VisitedRoomEntry } from "../../../lib/roomLobbyPrefs";
import type { ProfileDesign } from "../profileDesign";
import type { ProfileSectionId } from "../profileHubTheme";
import {
  buildOverviewHubItems,
  buildProfileTasks,
  OverviewHub,
  OverviewProfileProgress,
  OverviewRecentSessions,
  OverviewWelcomeHero,
} from "../profileOverviewUi";
import { ProfileSectionFrame } from "../profileUi";

type Props = {
  d: ProfileDesign;
  prefs: UserProfilePrefs;
  authUser: AuthUserDto | null;
  visited: VisitedRoomEntry[];
  visitedCount: number;
  favoriteCount: number;
  onGoSection: (id: ProfileSectionId) => void;
};

export function ProfileOverviewPanel({
  d,
  prefs,
  authUser,
  visited,
  visitedCount,
  favoriteCount,
  onGoSection,
}: Props) {
  const tasks = useMemo(() => buildProfileTasks(prefs, authUser), [prefs, authUser]);
  const hubItems = useMemo(
    () => buildOverviewHubItems(prefs, authUser, visitedCount, favoriteCount),
    [prefs, authUser, visitedCount, favoriteCount],
  );

  return (
    <ProfileSectionFrame d={d} sectionId="overview">
      <div className="flex min-w-0 flex-col gap-8">
        <OverviewWelcomeHero d={d} prefs={prefs} authUser={authUser} />
        <OverviewHub d={d} items={hubItems} onGoSection={onGoSection} />
        <OverviewProfileProgress d={d} tasks={tasks} onGoSection={onGoSection} />
        <OverviewRecentSessions d={d} visited={visited} onGoSection={onGoSection} />
      </div>
    </ProfileSectionFrame>
  );
}
